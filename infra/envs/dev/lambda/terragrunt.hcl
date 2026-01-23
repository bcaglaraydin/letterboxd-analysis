include "root" {
  path = find_in_parent_folders()
}

include "common" {
  path = "${get_terragrunt_dir()}/../common-lambda.hcl"
}

terraform {
  source = "../../../modules/lambda"
}

dependency "sqs" {
  config_path = "../sqs"
}

dependency "dynamodb" {
  config_path = "../dynamodb/films"
}

dependency "deployment_bucket" {
  config_path = "../lambda-deployment-bucket"
}

inputs = {
  function_name = "letterboxd-analysis-backend-dev"
  handler       = "src/index.handler"
  environment_variables = {
    NODE_ENV      = "development"
    SQS_QUEUE_URL = dependency.sqs.outputs.queue_url
    FILMS_TABLE   = dependency.dynamodb.outputs.table_name
  }
  memory_size = 1024
  timeout     = 600
  source_dir    = "${get_terragrunt_dir()}/../../../../backend"
  deployment_bucket = dependency.deployment_bucket.outputs.bucket_name

  inline_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "sqs:SendMessage",
        ]
        Effect   = "Allow"
        Resource = dependency.sqs.outputs.queue_arn
      },
      {
        Action = [
          "dynamodb:BatchGetItem",
          "dynamodb:GetItem"
        ]
        Effect   = "Allow"
        Resource = dependency.dynamodb.outputs.table_arn
      }
    ]
  })
}
