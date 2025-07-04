import { LabIcon } from '@jupyterlab/ui-components';
import { fileTextIcon } from '../../../../icons';
import { BaseCoreComponent } from '../../../BaseCoreComponent';

export class GlueDataCatalogOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { 
      connectionMethod: "env",
      glueOptions: {},
      transformationContext: "",
      format: "parquet"
    };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "Database Name",
          id: "databaseName",
          placeholder: "Enter Glue Catalog database name",
          tooltip: "The name of the Glue Data Catalog database where the table will be created/updated.",
          validation: "^[a-zA-Z0-9_-]+$",
          validationMessage: "Database name must contain only letters, numbers, hyphens, and underscores",
        },
        {
          type: "input",
          label: "Table Name",
          id: "tableName",
          placeholder: "Enter table name",
          tooltip: "The name of the table in the Glue Data Catalog.",
          validation: "^[a-zA-Z0-9_-]+$",
          validationMessage: "Table name must contain only letters, numbers, hyphens, and underscores",
        },
        {
          type: "input",
          label: "S3 Path",
          id: "s3Path",
          placeholder: "s3://bucket-name/path/to/data/",
          tooltip: "The S3 path where the data will be stored.",
          validation: "^s3://[a-z0-9.-]+/.*",
          validationMessage: "S3 path must start with s3:// and contain a valid bucket name",
        },
        {
          type: "select",
          label: "Format",
          id: "format",
          options: [
            { value: "parquet", label: "Parquet" },
            { value: "json", label: "JSON" },
            { value: "csv", label: "CSV" },
            { value: "orc", label: "ORC" },
            { value: "avro", label: "Avro" }
          ],
          tooltip: "The format to store the data in S3."
        },
        {
          type: "select",
          label: "Write Mode",
          id: "writeMode",
          options: [
            { value: "append", label: "Append" },
            { value: "overwrite", label: "Overwrite" },
            { value: "errorifexists", label: "Error if exists" },
            { value: "ignore", label: "Ignore" }
          ],
          tooltip: "How to handle existing data."
        },
        {
          type: "input",
          label: "Transformation Context",
          id: "transformationContext",
          placeholder: "Enter transformation context (optional)",
          tooltip: "A unique string that is used to track state for optimizing reads and writes.",
          advanced: true
        },
        {
          type: "select",
          label: "Connection Method",
          id: "connectionMethod",
          options: [
            { value: "env", label: "Environment Variables (Recommended)", tooltip: "Use AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY variables." },
            { value: "sso", label: "AWS SSO", tooltip: "Use AWS Single Sign-On (SSO) authentication with configured profiles." },
          ],
          advanced: true
        },
        {
          type: "input",
          label: "AWS SSO Profile",
          id: "awsSsoProfile",
          placeholder: "Enter SSO Profile Name",
          condition: { connectionMethod: "sso" },
          advanced: true
        },
        {
          type: "input",
          label: "AWS Region",
          id: "awsRegion",
          placeholder: "Enter AWS Region (e.g., us-east-1)",
          condition: { connectionMethod: "sso" },
          advanced: true
        },
        {
          type: "boolean",
          label: "Enable Partition",
          id: "glueOptions.enablePartition",
          tooltip: "Whether to enable partitioning for the output table.",
          advanced: true
        },
        {
          type: "input",
          label: "Partition Keys",
          id: "glueOptions.partitionKeys",
          placeholder: "Enter partition keys (comma-separated)",
          tooltip: "Column names to partition by (e.g., year, month, day).",
          condition: { "glueOptions.enablePartition": true },
          advanced: true
        }
      ],
    };

    const description = "Use AWS Glue Data Catalog Output to write data to S3 and register the table in AWS Glue Data Catalog. This component generates PySpark code compatible with AWS Glue ETL jobs.";

    super("AWS Glue Data Catalog Output", "glueDataCatalogOutput", description, "pandas_df_output", ["glue", "catalog"], "outputs", fileTextIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "from awsglue.context import GlueContext",
      "from awsglue.dynamicframe import DynamicFrame",
      "from pyspark.sql import SparkSession"
    ];
  }

  public generateComponentCode({ config, inputName }): string {
    const databaseName = config.databaseName || 'default';
    const tableName = config.tableName || 'output_table';
    const s3Path = config.s3Path || 's3://your-bucket/path/';
    const format = config.format || 'parquet';
    const writeMode = config.writeMode || 'append';
    const transformationContext = config.transformationContext || `${inputName}_output_context`;
    
    // Generate connection info based on method
    let connectionInfo = '';
    if (config.connectionMethod === 'sso' && config.awsSsoProfile) {
      connectionInfo = `
# AWS SSO authentication configured
# Profile: ${config.awsSsoProfile}
# Region: ${config.awsRegion || 'us-east-1'}
`;
    }

    // Generate partition information
    let partitionCode = '';
    if (config.glueOptions?.enablePartition && config.glueOptions?.partitionKeys) {
      const partitionKeys = config.glueOptions.partitionKeys.split(',').map(key => key.trim());
      partitionCode = `
# Apply partitioning
partition_keys = [${partitionKeys.map(key => `"${key}"`).join(', ')}]
`;
    }

    const code = `
${connectionInfo}
# Writing data to AWS Glue Data Catalog and S3
${partitionCode}
# Convert Spark DataFrame to Glue DynamicFrame
${inputName}_dynamic_frame = DynamicFrame.fromDF(
    ${inputName}, 
    glueContext, 
    "${transformationContext}"
)

# Write to S3 and update Data Catalog
datasink = glueContext.getSink(
    path="${s3Path}",
    connection_type="s3",
    updateBehavior="UPDATE_IN_DATABASE",
    partitionKeys=${config.glueOptions?.enablePartition ? 'partition_keys' : '[]'},
    enableUpdateCatalog=True,
    transformation_ctx="${transformationContext}"
)

datasink.setCatalogInfo(
    catalogDatabase="${databaseName}",
    catalogTableName="${tableName}"
)

datasink.setFormat("${format}")
datasink.writeFrame(${inputName}_dynamic_frame)

logger.info(f"Successfully wrote data to {databaseName}.{tableName} at {s3Path}")
`;
    return code;
  }

  public generateComponentIbisCode({ config, inputName }): string {
    // Ibis doesn't have direct Glue integration, fallback to pandas
    return this.generateComponentCode({ config, inputName });
  }
}