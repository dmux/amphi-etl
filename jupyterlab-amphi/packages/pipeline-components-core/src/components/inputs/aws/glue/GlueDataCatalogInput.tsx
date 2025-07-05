import { LabIcon } from '@jupyterlab/ui-components';
import { fileTextIcon } from '../../../../icons';
import { BaseCoreComponent } from '../../../BaseCoreComponent';// Adjust the import path

export class GlueDataCatalogInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { 
      connectionMethod: "env",
      glueOptions: {},
      transformationContext: ""
    };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "Database Name",
          id: "databaseName",
          placeholder: "Enter Glue Catalog database name",
          tooltip: "The name of the Glue Data Catalog database containing the table.",
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
          label: "Push Down Predicate",
          id: "glueOptions.pushDownPredicate",
          tooltip: "Whether to enable predicate pushdown for better performance.",
          advanced: true
        },
        {
          type: "input",
          label: "Additional Options",
          id: "glueOptions.additionalOptions",
          placeholder: "Enter additional options as key=value pairs",
          tooltip: "Additional options for the Glue DynamicFrame creation.",
          advanced: true
        }
      ],
    };

    const description = "Use AWS Glue Data Catalog Input to read data from tables registered in AWS Glue Data Catalog. This component generates PySpark code compatible with AWS Glue ETL jobs.";

    super("AWS Glue Data Catalog Input", "glueDataCatalogInput", description, "pandas_df_input", ["glue", "catalog"], "inputs", fileTextIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "from awsglue.context import GlueContext",
      "from awsglue.dynamicframe import DynamicFrame",
      "from pyspark.sql import SparkSession"
    ];
  }

  public generateComponentCode({ config, outputName }): string {
    const databaseName = config.databaseName || 'default';
    const tableName = config.tableName || 'table';
    const transformationContext = config.transformationContext || `${outputName}_context`;
    
    // Generate connection info based on method
    let connectionInfo = '';
    if (config.connectionMethod === 'sso' && config.awsSsoProfile) {
      connectionInfo = `
# AWS SSO authentication configured
# Profile: ${config.awsSsoProfile}
# Region: ${config.awsRegion || 'us-east-1'}
`;
    }

    // Generate additional options
    let additionalOptions = '';
    if (config.glueOptions?.pushDownPredicate) {
      additionalOptions += ', "push_down_predicate": True';
    }

    const code = `
${connectionInfo}
# Reading data from AWS Glue Data Catalog
${outputName}_dynamic_frame = glueContext.create_dynamic_frame.from_catalog(
    database="${databaseName}",
    table_name="${tableName}",
    transformation_ctx="${transformationContext}"${additionalOptions}
)

# Convert to Spark DataFrame
${outputName} = ${outputName}_dynamic_frame.toDF()
${outputName}.cache()  # Cache for performance
`;
    return code;
  }

  public generateComponentIbisCode({ config, outputName }): string {
    // Ibis doesn't have direct Glue integration, fallback to pandas
    return this.generateComponentCode({ config, outputName });
  }
}