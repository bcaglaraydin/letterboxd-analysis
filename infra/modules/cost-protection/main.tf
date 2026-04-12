# ==============================================================================
# COST PROTECTION MODULE
# ==============================================================================
# - AWS Budget ($15)
# - SSM Kill Switch (/app/analysis_enabled)
# - Budget-Killer Lambda (SNS Triggered)
# ==============================================================================

resource "aws_ssm_parameter" "analysis_enabled" {
  name  = var.ssm_parameter_name
  type  = "String"
  value = "true"
  
  lifecycle {
    ignore_changes = [] # Allow manual/lambda overrides
  }

  tags = {
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# SNS TOPIC FOR BUDGET ALERTS
# ------------------------------------------------------------------------------

resource "aws_sns_topic" "budget_alerts" {
  name = "${var.project_name}-budget-alerts-${var.environment}"
}

# ------------------------------------------------------------------------------
# AWS BUDGET
# ------------------------------------------------------------------------------

resource "aws_budgets_budget" "monthly" {
  name              = "${var.project_name}-monthly-budget-${var.environment}"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2024-01-01_00:00" # Arbitrary start

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.budget_alerts.arn]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.budget_alerts.arn]
  }
}

# ------------------------------------------------------------------------------
# BUDGET KILLER LAMBDA (INLINE)
# ------------------------------------------------------------------------------

data "archive_file" "budget_killer_zip" {
  type        = "zip"
  output_path = "${path.module}/budget_killer.zip"
  
  source {
    content  = <<-EOT
      const { SSMClient, PutParameterCommand } = require("@aws-sdk/client-ssm");
      const client = new SSMClient();

      exports.handler = async (event) => {
          console.log("Budget Alert Received:", JSON.stringify(event));
          
          const command = new PutParameterCommand({
              Name: process.env.SSM_PARAMETER_NAME,
              Value: "false",
              Overwrite: true
          });
          
          try {
              await client.send(command);
              console.log("System disabled successfully via SSM.");
          } catch (err) {
              console.error("Failed to disable system:", err);
              throw err;
          }
      };
    EOT
    filename = "index.js"
  }
}

resource "aws_lambda_function" "budget_killer" {
  filename         = data.archive_file.budget_killer_zip.output_path
  source_code_hash = data.archive_file.budget_killer_zip.output_base64sha256
  function_name    = "${var.project_name}-budget-killer-${var.environment}"
  role             = aws_iam_role.budget_killer_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"

  environment {
    variables = {
      SSM_PARAMETER_NAME = var.ssm_parameter_name
    }
  }
}

# ------------------------------------------------------------------------------
# IAM FOR BUDGET KILLER
# ------------------------------------------------------------------------------

resource "aws_iam_role" "budget_killer_role" {
  name = "${var.project_name}-budget-killer-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Effect = "Allow"
      }
    ]
  })
}

resource "aws_iam_role_policy" "budget_killer_ssm" {
  name = "allow-ssm-update"
  role = aws_iam_role.budget_killer_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ssm:PutParameter",
          "ssm:GetParameter"
        ]
        Effect   = "Allow"
        Resource = aws_ssm_parameter.analysis_enabled.arn
      },
      {
        Action   = "logs:CreateLogGroup"
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Action   = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/${var.project_name}-budget-killer-${var.environment}:*"
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# TRIGGER CONFIG
# ------------------------------------------------------------------------------

resource "aws_sns_topic_subscription" "budget_killer_subscription" {
  topic_arn = aws_sns_topic.budget_alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.budget_killer.arn
}

resource "aws_lambda_permission" "allow_sns" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.budget_killer.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.budget_alerts.arn
}
