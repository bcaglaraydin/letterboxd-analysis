include "root" {
  path = find_in_parent_folders()
}

include "common" {
  path = "${get_terragrunt_dir()}/../common-lambda.hcl"
}

terraform {
  source = "../../../modules/lambda"
}

dependency "films" {
  config_path = "../dynamodb/films"
}

inputs = {
  function_name = "letterboxd-analysis-metrics-dev"
  handler       = "src/handlers/metrics.handler"
  memory_size   = 1024
  timeout       = 30
  source_dir    = "${get_terragrunt_dir()}/../../../../backend"

  environment_variables = {
    NODE_ENV    = "development"
    FILMS_TABLE = dependency.films.outputs.table_name
  }

  policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  ]

  inline_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:BatchGetItem",
          "dynamodb:GetItem"
        ]
        Effect   = "Allow"
        Resource = dependency.films.outputs.table_arn
      }
    ]
  })
}
