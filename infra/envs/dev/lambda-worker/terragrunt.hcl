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

dependency "films" {
  config_path = "../dynamodb/films"

  sqs_event_source_arn = dependency.sqs.outputs.queue_arn

  policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
  ]

  inline_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:PutItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:GetItem",
        ]
        Effect   = "Allow"
        Resource = dependency.films.outputs.table_arn
      }
    ]
  })
}
