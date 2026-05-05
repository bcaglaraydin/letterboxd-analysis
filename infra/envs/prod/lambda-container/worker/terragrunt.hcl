include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../../modules/lambda-container"
}

dependency "sqs" {
  config_path = "../../sqs"
}

dependency "films" {
  config_path = "../../dynamodb/films"
}

dependency "ecr" {
  config_path = "../../../../shared/ecr/worker"
}

inputs = {
  function_name = "letterboxd-analysis-worker-prod"
  image_uri     = "${dependency.ecr.outputs.repository_url}:${get_env("IMAGE_TAG", "latest")}"
  environment   = "prod"
  memory_size   = 2048
  timeout       = 300

  environment_variables = {
    NODE_ENV            = "production"
    FILMS_TABLE         = dependency.films.outputs.table_name
    SQS_QUEUE_URL       = dependency.sqs.outputs.queue_url
    BROWSER_MAX_PAGES   = "10"
    BROWSER_CONCURRENCY = "10"
  }

  reserved_concurrent_executions = 5

  sqs_event_source_arn = dependency.sqs.outputs.queue_arn
  sqs_batch_size       = 2
  sqs_batch_window     = 0

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
          "dynamodb:BatchGetItem"
        ]
        Effect   = "Allow"
        Resource = dependency.films.outputs.table_arn
      },
      {
        Action   = "sqs:SendMessage"
        Effect   = "Allow"
        Resource = dependency.sqs.outputs.queue_arn
      }
    ]
  })
}
