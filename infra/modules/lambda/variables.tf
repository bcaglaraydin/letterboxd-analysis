variable "function_name" {
  type = string
}

variable "handler" {
  type = string
}

variable "runtime" {
  type = string
}

variable "source_dir" {
  type = string
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "memory_size" {
  type    = number
  default = 128
}

variable "timeout" {
  type    = number
  default = 3
}

variable "sqs_event_source_arn" {
  description = "The ARN of the SQS queue to trigger the Lambda function"
  type        = string
  default     = null
}

variable "policy_arns" {
  description = "List of IAM policy ARNs to attach to the Lambda execution role"
  type        = list(string)
  default     = []
}

variable "inline_policy_json" {
  description = "JSON string for inline IAM policy"
  type        = string
  default     = null
}

variable "log_retention_days" {
  description = "Number of days to retain logs in CloudWatch"
  type        = number
  default     = 7
}
