output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.this.function_name
}

output "alias_arn" {
  description = "The ARN of the Lambda alias"
  value       = aws_lambda_alias.this.arn
}

output "function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.this.arn
}

output "invoke_arn" {
  description = "Invoke ARN for API Gateway integration"
  value       = aws_lambda_function.this.invoke_arn
}

output "role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.iam_for_lambda.arn
}

output "role_name" {
  description = "Name of the Lambda execution role"
  value       = aws_iam_role.iam_for_lambda.name
}
