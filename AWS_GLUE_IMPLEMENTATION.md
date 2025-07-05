# AWS Glue Export Feature Implementation

This document describes the implementation of AWS Glue export functionality and SSO authentication in the Amphi ETL project.

## Features Implemented

### 1. SSO AWS Authentication
- **File**: `S3OptionsHandler.ts`
- **Enhancement**: Added AWS SSO authentication option to existing AWS connection methods
- **New Options**:
  - AWS SSO profile configuration
  - AWS region specification for SSO
  - Seamless integration with existing environment variable and storage options methods

### 2. AWS Glue Code Generator
- **File**: `CodeGeneratorGlue.tsx`
- **Pattern**: Follows the existing `CodeGeneratorDagster.tsx` pattern
- **Features**:
  - Converts pandas DataFrame operations to PySpark equivalents
  - Generates AWS Glue DynamicFrame operations
  - Handles AWS Glue job initialization and configuration
  - Provides boto3 integration for deployment
  - Creates deployment scripts for AWS API integration

### 3. Export UI Integration
- **File**: `PipelineEditorWidget.tsx`
- **Enhancement**: Added AWS Glue export option to existing export menu
- **Features**:
  - Configuration dialog for job parameters (job name, S3 bucket, region, IAM role)
  - Form validation for required fields
  - Option to generate deployment script
  - Clean integration with existing Dagster export functionality

### 4. AWS Glue Components
- **Files**: 
  - `GlueDataCatalogInput.tsx`
  - `GlueDataCatalogOutput.tsx`
- **Features**:
  - Data Catalog table input/output operations
  - SSO authentication support
  - PySpark code generation
  - Partitioning and optimization options

### 5. Visual Assets
- **File**: `aws-glue-24.svg`
- **Integration**: Added to `icons.ts` for consistent UI experience

## Implementation Approach

### Minimal Changes Philosophy
1. **Extended Existing Patterns**: Used Dagster export as a template
2. **Additive Changes**: No existing functionality was modified or removed
3. **Clean Separation**: AWS Glue functionality is isolated in dedicated files
4. **Consistent Integration**: Follows existing component registration patterns

### Code Generation Strategy
1. **Base Class Extension**: Inherits from `BaseCodeGenerator` like Dagster implementation
2. **Pandas to PySpark Conversion**: Automatic translation of DataFrame operations
3. **AWS Glue Specifics**: Handles DynamicFrames, Data Catalog, and S3 integration
4. **Deployment Ready**: Generates both execution and deployment scripts

### Authentication Enhancement
1. **Backward Compatible**: Existing authentication methods unchanged
2. **SSO Integration**: Added as new option alongside existing methods
3. **Environment Variable Support**: Maintains existing patterns for configuration

## File Structure

```
jupyterlab-amphi/packages/
├── pipeline-components-core/src/
│   ├── components/
│   │   ├── common/S3OptionsHandler.ts (enhanced)
│   │   ├── inputs/aws/glue/GlueDataCatalogInput.tsx (new)
│   │   └── outputs/aws/glue/GlueDataCatalogOutput.tsx (new)
│   └── index.ts (updated registrations)
├── pipeline-components-manager/src/
│   ├── CodeGeneratorGlue.tsx (new)
│   └── index.ts (updated exports)
└── pipeline-editor/src/
    ├── PipelineEditorWidget.tsx (enhanced)
    ├── icons.ts (updated)
    └── style/icons/aws-glue-24.svg (new)
```

## Usage Flow

1. **Pipeline Creation**: Users create pipelines with AWS components
2. **Code Generation**: Click "Generate Code" button in pipeline editor
3. **Export Selection**: Choose "Export to AWS Glue" from dropdown menu
4. **Configuration**: Fill in job parameters in configuration dialog
5. **Code Generation**: System generates:
   - Main AWS Glue ETL script (PySpark compatible)
   - Deployment script (boto3 based)
6. **Deployment**: Use generated deployment script or manual AWS console deployment

## Technical Details

### Dependencies
- **Minimal Requirement**: `boto3` for AWS API integration
- **AWS Glue**: Uses standard AWS Glue libraries (awsglue, pyspark)
- **Authentication**: Supports AWS SSO, environment variables, and direct credentials

### Code Conversion
- **Input Operations**: pandas.read_* → glueContext.create_dynamic_frame.*
- **Transformations**: DataFrame operations → PySpark DataFrame operations
- **Output Operations**: DataFrame.to_* → GlueContext datasink operations

### Deployment Script Features
- **S3 Upload**: Automatically uploads scripts to S3
- **Job Management**: Creates or updates AWS Glue jobs
- **Configuration**: Handles all required AWS Glue job parameters
- **Error Handling**: Provides clear error messages and status updates

## Benefits

1. **Seamless Integration**: Works within existing Amphi workflow
2. **Minimal Learning Curve**: Follows established patterns
3. **Production Ready**: Generates deployment-ready code
4. **Flexible Authentication**: Supports multiple AWS auth methods
5. **Scalable**: Built on AWS Glue's serverless architecture

## Future Enhancements

1. **Job Monitoring**: Integration with AWS Glue job monitoring
2. **Advanced Transformations**: More sophisticated pandas-to-spark conversions
3. **Catalog Management**: Automated schema evolution and catalog updates
4. **Cost Optimization**: Smart capacity allocation based on data size
5. **Testing Integration**: Unit test generation for Glue jobs