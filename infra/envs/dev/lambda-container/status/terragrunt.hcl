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

dependency "ecr" {
  config_path = "../../ecr/status"
}

inputs = {
  function_name = "letterboxd-analysis-status-dev"
  image_uri     = "${dependency.ecr.outputs.repository_url}:${get_env("IMAGE_TAG", "latest")}"
  environment   = "dev"
  memory_size   = 1024
  timeout       = 30

  environment_variables = {
    NODE_ENV        = "development"
    FILMS_TABLE     = dependency.films.outputs.table_name
    USER_JOBS_TABLE = dependency.user_jobs.outputs.table_name
  }

  policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  ]

  inline_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem"
        ]
        Effect   = "Allow"
        Resource = dependency.films.outputs.table_arn
      },
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:DeleteItem"
        ]
        Effect   = "Allow"
        Resource = dependency.user_jobs.outputs.table_arn
      }
    ]
  })
}
