output "ssm_parameter_arn" {
  value = aws_ssm_parameter.analysis_enabled.arn
}

output "ssm_parameter_name" {
  value = aws_ssm_parameter.analysis_enabled.name
}

output "sns_topic_arn" {
  value = aws_sns_topic.budget_alerts.arn
}

output "budget_id" {
  value = aws_budgets_budget.monthly.id
}
