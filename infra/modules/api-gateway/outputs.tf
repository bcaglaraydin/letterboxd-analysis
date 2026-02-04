output "api_endpoint" {
  value = aws_apigatewayv2_api.this.api_endpoint
}

output "api_name" {
  value = aws_apigatewayv2_api.this.name
}

output "execution_arn" {
  description = "Execution ARN for Lambda invoke permissions"
  value       = aws_apigatewayv2_api.this.execution_arn
}
