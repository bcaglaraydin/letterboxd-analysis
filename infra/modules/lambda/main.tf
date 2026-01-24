data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/lambda.zip"
  excludes = [
    "tests",
    ".git",
    ".vscode",
    ".github",
    "README.md",
    "package-lock.json",
    "node_modules/.cache",
    "coverage"
  ]
}

# Upload Lambda code to S3 first (raises limit from 50MB to 250MB)
resource "aws_s3_object" "lambda_code" {
  bucket = var.deployment_bucket
  key    = "${var.function_name}/lambda.zip"
  source = data.archive_file.lambda_zip.output_path
  etag   = data.archive_file.lambda_zip.output_md5
}

resource "aws_lambda_function" "this" {
  s3_bucket                      = var.deployment_bucket
  s3_key                         = aws_s3_object.lambda_code.key
  s3_object_version              = aws_s3_object.lambda_code.version_id
  function_name                  = var.function_name
  role                           = aws_iam_role.iam_for_lambda.arn
  handler                        = var.handler
  source_code_hash               = data.archive_file.lambda_zip.output_base64sha256
  runtime                        = var.runtime
  memory_size                    = var.memory_size
  timeout                        = var.timeout
  reserved_concurrent_executions = var.reserved_concurrent_executions

  environment {
    variables = var.environment_variables
  }
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_iam_role" "iam_for_lambda" {
  name = "${var.function_name}-role"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
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

resource "time_sleep" "wait_for_iam" {
  depends_on = [
    aws_iam_role_policy.inline_policy,
    aws_iam_role_policy_attachment.custom_policies
  ]

  create_duration = "30s"
}

resource "aws_lambda_event_source_mapping" "sqs" {
  count                              = var.sqs_event_source_arn != null ? 1 : 0
  event_source_arn                   = var.sqs_event_source_arn
  function_name                      = aws_lambda_function.this.arn
  batch_size                         = var.sqs_batch_size
  maximum_batching_window_in_seconds = var.sqs_batch_window
  function_response_types            = ["ReportBatchItemFailures"]
  depends_on                         = [time_sleep.wait_for_iam]
}

resource "aws_iam_role_policy" "inline_policy" {
  count  = var.inline_policy_json != null ? 1 : 0
  name   = "${var.function_name}-inline-policy"
  role   = aws_iam_role.iam_for_lambda.id
  policy = var.inline_policy_json
}
