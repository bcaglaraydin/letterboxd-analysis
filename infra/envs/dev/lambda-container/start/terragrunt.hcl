include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../../modules/lambda-container"
}

dependency "films" {
  config_path = "../../dynamodb/films"
}

dependency "user_jobs" {
  config_path = "../../dynamodb/user-jobs"
}

dependency "sqs" {
  config_path = "../../sqs"
}

dependency "sqs_list" {
  config_path = "../../sqs-list"
}

dependency "ecr" {
  config_path = "../../../../shared/ecr/start"
}

dependency "quotas" {
  config_path = "../../dynamodb/quotas"
}

dependency "global_usage" {
  config_path = "../../dynamodb/global-usage"
}

dependency "cost_protection" {
  config_path = "../../cost-protection"
}

inputs = {
  function_name = "letterboxd-analysis-start-dev"
  image_uri     = "${dependency.ecr.outputs.repository_url}:${get_env("IMAGE_TAG", "latest")}"
  environment   = "dev"
  memory_size   = 256
  timeout       = 30

  environment_variables = {
    NODE_ENV           = "production"
    FILMS_TABLE        = dependency.films.outputs.table_name
    USER_JOBS_TABLE    = dependency.user_jobs.outputs.table_name
    QUOTAS_TABLE       = dependency.quotas.outputs.table_name
    GLOBAL_USAGE_TABLE = dependency.global_usage.outputs.table_name
    SQS_QUEUE_URL      = dependency.sqs.outputs.queue_url
    SQS_LIST_QUEUE_URL = dependency.sqs_list.outputs.queue_url
    SIGNING_SECRET     = get_env("SIGNING_SECRET", "dev_secret_only")
    BROWSER_MAX_PAGES  = "5"
    SCRAPING_CONCURRENCY_LIST = "2"
    SCRAPING_CONCURRENCY_FILM = "5"
    API_READ_ACCESS_TOKEN = get_env("API_READ_ACCESS_TOKEN", "")
    ADMIN_IPS             = get_env("ADMIN_IPS", "")
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
          "dynamodb:GetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:PutItem"
        ]
        Effect   = "Allow"
        Resource = dependency.films.outputs.table_arn
      },
      {
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Effect   = "Allow"
        Resource = [
          dependency.user_jobs.outputs.table_arn,
          dependency.quotas.outputs.table_arn,
          dependency.global_usage.outputs.table_arn
        ]
      },
      {
        Action   = "sqs:SendMessage"
        Effect   = "Allow"
        Resource = [
          dependency.sqs.outputs.queue_arn,
          dependency.sqs_list.outputs.queue_arn
        ]
      },
      {
        Action = [
          "ssm:GetParameter"
        ]
        Effect   = "Allow"
        Resource = dependency.cost_protection.outputs.ssm_parameter_arn
      }
    ]
  })
}
