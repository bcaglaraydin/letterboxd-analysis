# ==============================================================================
# LAMBDA CONTAINER MODULE
# ==============================================================================
# Creates a Lambda function using a container image from ECR
# This replaces the ZIP-based lambda module for containerized deployments
# ==============================================================================

resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = aws_iam_role.iam_for_lambda.arn

  # Container image configuration
  package_type = "Image"
  image_uri    = var.image_uri

  memory_size                    = var.memory_size
  timeout                        = var.timeout
  reserved_concurrent_executions = var.reserved_concurrent_executions
  architectures                  = var.architectures

  environment {
    variables = merge(
      var.environment_variables,
      { ENVIRONMENT = var.environment }
    )
  }

  # Ensure IAM role is ready before creating Lambda
  depends_on = [
    time_sleep.wait_for_iam
  ]

  tags = {
    Name        = var.function_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  publish = true
}

resource "aws_lambda_alias" "this" {
  name             = var.alias_name
  function_name    = aws_lambda_function.this.function_name
  function_version = aws_lambda_function.this.version
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days
}

# ==============================================================================
# IAM ROLE
# ==============================================================================

resource "aws_iam_role" "iam_for_lambda" {
  name = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Effect = "Allow"
        Sid    = ""
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.iam_for_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "custom_policies" {
  count      = length(var.policy_arns)
  role       = aws_iam_role.iam_for_lambda.name
  policy_arn = var.policy_arns[count.index]
}

resource "aws_iam_role_policy" "inline_policy" {
  count  = var.inline_policy_json != null ? 1 : 0
  name   = "${var.function_name}-inline-policy"
  role   = aws_iam_role.iam_for_lambda.id
  policy = var.inline_policy_json
}

# Wait for IAM to propagate before creating resources that depend on it
resource "time_sleep" "wait_for_iam" {
  depends_on = [
    aws_iam_role_policy.inline_policy,
    aws_iam_role_policy_attachment.custom_policies
  ]

  create_duration = "30s"
}

# ==============================================================================
# SQS EVENT SOURCE MAPPING (Optional)
# ==============================================================================

resource "aws_lambda_event_source_mapping" "sqs" {
  count                              = var.sqs_event_source_arn != null ? 1 : 0
  event_source_arn                   = var.sqs_event_source_arn
  function_name                      = aws_lambda_function.this.arn
  batch_size                         = var.sqs_batch_size
  maximum_batching_window_in_seconds = var.sqs_batch_window
  function_response_types            = ["ReportBatchItemFailures"]
  depends_on                         = [time_sleep.wait_for_iam]
}

# ==============================================================================
# API GATEWAY PERMISSION (Optional)
# ==============================================================================

resource "aws_lambda_permission" "api_gateway" {
  count         = var.api_gateway_source_arn != null ? 1 : 0
  statement_id  = "allow-api-gateway-invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = var.api_gateway_source_arn
}
