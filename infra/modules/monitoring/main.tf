resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = var.create_alarms ? var.lambdas : {}

  alarm_name          = "${each.value.function_name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Lambda has errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = each.value.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "api_gw_5xx" {
  for_each = var.create_alarms ? toset(var.api_gateway_names) : toset([])

  alarm_name          = "${each.key}-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "API Gateway 5xx errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = each.key
  }
}

resource "aws_cloudwatch_metric_alarm" "sqs_age" {
  for_each = var.create_alarms ? toset(var.sqs_queue_names) : toset([])

  alarm_name          = "${each.key}-high-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 300 # 5 minutes
  alarm_description   = "SQS message age is too high (> 5m)"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = each.key
  }
}
