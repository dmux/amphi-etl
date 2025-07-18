// ================================================
// CodeGeneratorGlue.ts
// ================================================

import {
  PipelineService, Node, Flow
} from './PipelineService';
import { BaseCodeGenerator, NodeObject } from './BaseCodeGenerator';

export class CodeGeneratorGlue extends BaseCodeGenerator {
  static generateGlueCode(
    pipelineJson: string, 
    commands: any, 
    componentService: any, 
    variablesAutoNaming: boolean,
    jobName: string = 'amphi_glue_job',
    s3BucketName: string = '',
    region: string = 'us-east-1'
  ): string {
    console.log("Inside generateGlueCode method");

    const flow = PipelineService.filterPipeline(pipelineJson);
    const { nodesToTraverse, nodesMap, nodeDependencies } = BaseCodeGenerator.computeNodesToTraverse(
      flow,
      'none',
      componentService
    );

    const glueImports = [
      'import sys',
      'from awsglue.transforms import *',
      'from awsglue.utils import getResolvedOptions',
      'from pyspark.context import SparkContext',
      'from awsglue.context import GlueContext',
      'from awsglue.job import Job'
    ];

    const envVariablesCode = BaseCodeGenerator.getEnvironmentVariableCode(pipelineJson, componentService);
    const connectionsCode = BaseCodeGenerator.getConnectionCode(pipelineJson, componentService);

    const uniqueImports = new Set<string>();
    const uniqueDependencies = new Set<string>();
    const uniqueFunctions = new Set<string>();

    // Collect imports and dependencies
    for (const nodeId of nodesToTraverse) {
      const node = nodesMap.get(nodeId);
      if (!node) continue;
      const config: any = node.data;
      const component = componentService.getComponent(node.type);
      
      // Convert pandas operations to PySpark equivalents
      const sparkImports = this.convertToSparkImports(component.provideImports({ config }));
      sparkImports.forEach(imp => uniqueImports.add(imp));
      
      if (typeof component.provideDependencies === 'function') {
        component.provideDependencies({ config }).forEach(d => uniqueDependencies.add(d));
      }
      if (typeof component.provideFunctions === 'function') {
        component.provideFunctions({ config }).forEach(f => uniqueFunctions.add(f));
      }
    }

    // Generate job initialization
    const jobInit = this.generateJobInitialization(jobName);

    // Generate main logic
    const mainLogic = this.generateMainLogic(flow, nodesMap, nodesToTraverse, componentService, variablesAutoNaming);

    // Generate job commit
    const jobCommit = 'job.commit()';

    // Combine all parts
    const now = new Date();
    const dateString = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const dateComment = `# Source code generated by Amphi for AWS Glue\\n# Date: ${dateString}\\n`;
    const additionalDeps = `# AWS Glue Job: ${jobName}\\n# S3 Bucket: ${s3BucketName}\\n# Region: ${region}\\n`;

    const glueCode = [
      dateComment,
      additionalDeps,
      '',
      ...glueImports,
      ...Array.from(uniqueImports),
      '',
      jobInit,
      '',
      envVariablesCode,
      connectionsCode,
      '',
      mainLogic,
      '',
      jobCommit
    ].join('\\n');

    return glueCode;
  }

  /**
   * Convert pandas imports to PySpark/Glue equivalents
   */
  private static convertToSparkImports(imports: string[]): string[] {
    const sparkImports: string[] = [];
    
    imports.forEach(imp => {
      if (imp.includes('pandas as pd')) {
        sparkImports.push('from pyspark.sql import functions as F');
        sparkImports.push('from pyspark.sql.types import *');
      } else if (imp.includes('boto3')) {
        sparkImports.push('import boto3');
      } else {
        // Keep other imports as-is
        sparkImports.push(imp);
      }
    });
    
    return sparkImports;
  }

  /**
   * Generate AWS Glue job initialization code
   */
  private static generateJobInitialization(jobName: string): string {
    return `
# AWS Glue job initialization
args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Job configuration
job_name = "${jobName}"
logger = glueContext.get_logger()
logger.info(f"Starting AWS Glue job: {job_name}")`;
  }

  /**
   * Generate main logic converting pandas operations to PySpark
   */
  private static generateMainLogic(
    flow: Flow,
    nodesMap: Map<string, Node>,
    nodesToTraverse: string[],
    componentService: any,
    variablesAutoNaming: boolean
  ): string {
    const codeBlocks: string[] = [];
    
    for (const nodeId of nodesToTraverse) {
      const node = nodesMap.get(nodeId);
      if (!node) continue;
      
      const config: any = node.data;
      const component = componentService.getComponent(node.type);
      
      // Generate output name
      const outputName = variablesAutoNaming 
        ? CodeGeneratorGlue.generateReadableName(config.customTitle || node.type)
        : (config.customTitle || `${node.type}_${nodeId}`);
      
      // Convert component code to PySpark
      let componentCode = component.generateComponentCode({ config, outputName });
      componentCode = this.convertPandasToPySpark(componentCode, outputName);
      
      codeBlocks.push(`# Node: ${node.type} (${nodeId})`);
      codeBlocks.push(componentCode);
      codeBlocks.push('');
    }
    
    return codeBlocks.join('\\n');
  }

  /**
   * Convert pandas DataFrame operations to PySpark DataFrame operations
   */
  private static convertPandasToPySpark(code: string, outputName: string): string {
    let sparkCode = code;
    
    // Convert pandas read operations to Glue DynamicFrame operations
    sparkCode = sparkCode.replace(
      /pd\.read_csv\(([^)]+)\)/g,
      (match, args) => {
        return `glueContext.create_dynamic_frame.from_options(
    format="csv",
    connection_type="s3",
    format_options={"withHeader": True},
    connection_options={"paths": [${args}]}
).toDF()`;
      }
    );
    
    sparkCode = sparkCode.replace(
      /pd\.read_parquet\(([^)]+)\)/g,
      (match, args) => {
        return `glueContext.create_dynamic_frame.from_options(
    format="parquet",
    connection_type="s3",
    connection_options={"paths": [${args}]}
).toDF()`;
      }
    );
    
    // Convert pandas operations to PySpark equivalents
    sparkCode = sparkCode.replace(/\.convert_dtypes\(\)/g, '');
    sparkCode = sparkCode.replace(/\.fillna\(/g, '.fillna(');
    sparkCode = sparkCode.replace(/\.dropna\(/g, '.dropna(');
    sparkCode = sparkCode.replace(/\.drop_duplicates\(/g, '.distinct(');
    
    // Add DataFrame caching for optimization
    sparkCode += `\\n${outputName}.cache()`;
    
    return sparkCode;
  }

  /**
   * Generate deployment script for AWS Glue
   */
  static generateDeploymentScript(
    jobName: string,
    s3BucketName: string,
    region: string,
    roleArn: string,
    scriptLocation?: string
  ): string {
    const script = `#!/usr/bin/env python3
"""
AWS Glue Job Deployment Script
Generated by Amphi ETL
"""

import boto3
import json
from pathlib import Path

def deploy_glue_job():
    # Initialize Glue client
    glue_client = boto3.client('glue', region_name='${region}')
    
    job_name = '${jobName}'
    
    # Job configuration
    job_config = {
        'Name': job_name,
        'Role': '${roleArn}',
        'Command': {
            'Name': 'glueetl',
            'ScriptLocation': '${scriptLocation || `s3://${s3BucketName}/scripts/${jobName}.py`}',
            'PythonVersion': '3'
        },
        'DefaultArguments': {
            '--TempDir': 's3://${s3BucketName}/temp/',
            '--job-bookmark-option': 'job-bookmark-enable',
            '--enable-metrics': '',
            '--enable-continuous-cloudwatch-log': 'true'
        },
        'MaxRetries': 1,
        'AllocatedCapacity': 2,
        'Timeout': 2880,
        'GlueVersion': '3.0'
    }
    
    try:
        # Try to update existing job
        response = glue_client.update_job(
            JobName=job_name,
            JobUpdate=job_config
        )
        print(f"Updated AWS Glue job: {job_name}")
        
    except glue_client.exceptions.EntityNotFoundException:
        # Create new job if it doesn't exist
        response = glue_client.create_job(**job_config)
        print(f"Created AWS Glue job: {job_name}")
    
    except Exception as e:
        print(f"Error deploying job: {str(e)}")
        return False
    
    print(f"Job ARN: {response.get('Name', 'N/A')}")
    return True

def upload_script_to_s3(script_content: str):
    """Upload the generated script to S3"""
    s3_client = boto3.client('s3', region_name='${region}')
    
    script_key = f'scripts/${jobName}.py'
    
    try:
        s3_client.put_object(
            Bucket='${s3BucketName}',
            Key=script_key,
            Body=script_content.encode('utf-8'),
            ContentType='text/x-python'
        )
        print(f"Uploaded script to s3://${s3BucketName}/{script_key}")
        return f's3://${s3BucketName}/{script_key}'
    except Exception as e:
        print(f"Error uploading script: {str(e)}")
        return None

if __name__ == '__main__':
    # Read the generated Glue script
    script_path = Path('${jobName}.py')
    if script_path.exists():
        with open(script_path, 'r') as f:
            script_content = f.read()
        
        # Upload script to S3
        script_location = upload_script_to_s3(script_content)
        
        if script_location:
            # Deploy the job
            success = deploy_glue_job()
            if success:
                print("\\nDeployment completed successfully!")
                print(f"You can now run the job using:")
                print(f"aws glue start-job-run --job-name {jobName} --region ${region}")
            else:
                print("Deployment failed!")
    else:
        print(f"Script file {script_path} not found!")
`;

    return script;
  }

  /**
   * Generate readable name for variables
   */
  static generateReadableName(rawName: string): string {
    const camelCaseName = rawName
      .split(/(?=[A-Z])/)
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
    return camelCaseName;
  }
}