variable "api_name" {
  type = string
}

variable "integrations" {
  description = "Map of integrations"
  type = map(object({
    lambda_invoke_arn    = string
    lambda_function_name = string
    route_key            = string
    timeout_milliseconds = optional(number, 30000)
  }))
}

variable "log_retention_days" {
  description = "Number of days to retain logs in CloudWatch"
  type        = number
  default     = 7
}

variable "allow_origins" {
  description = "List of allowed origins for CORS. Must be set per-environment."
  type        = list(string)
  default     = []
}

variable "throttling_rate_limit" {
  description = "Throttling rate limit (steady-state)"
  type        = number
  default     = 5
}

variable "throttling_burst_limit" {
  description = "Throttling burst limit"
  type        = number
  default     = 10
}
