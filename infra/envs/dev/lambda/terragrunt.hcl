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

inputs = {
  function_name = "letterboxd-analysis-backend-dev"
  handler       = "src/index.handler"
  environment_variables = {
    NODE_ENV      = "development"
    SQS_QUEUE_URL = dependency.sqs.outputs.queue_url
  }
  memory_size = 1024
  timeout     = 600
  source_dir    = "${get_terragrunt_dir()}/../../../../backend"

  inline_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "sqs:SendMessage",
        ]
        Effect   = "Allow"
        Resource = dependency.sqs.outputs.queue_arn
      }
    ]
  })
}
