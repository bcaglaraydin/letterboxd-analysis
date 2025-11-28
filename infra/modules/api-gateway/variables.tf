variable "api_name" {
  type = string
}

variable "integrations" {
  description = "Map of integrations"
  type = map(object({
    lambda_invoke_arn    = string
    lambda_function_name = string
    route_key            = string
  }))
}
