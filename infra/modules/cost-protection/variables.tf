variable "environment" {
  type    = string
  default = "dev"
}

variable "project_name" {
  type    = string
  default = "letterboxd-analysis"
}

variable "monthly_budget" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 15
}

variable "notification_email" {
  description = "Email to notify for budget alerts (optional)"
  type        = string
  default     = null
}

variable "ssm_parameter_name" {
  description = "SSM parameter name for the kill switch"
  type        = string
  default     = "/app/analysis_enabled"
}
