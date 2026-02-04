variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "image_uri" {
  description = "ECR image URI (repository:tag)"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
  default     = "dev"
}

variable "alias_name" {
  description = "Name of the Lambda alias"
  type        = string
  default     = "dev"
}

variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

variable "memory_size" {
  description = "Memory size in MB"
  type        = number
  default     = 128
}

variable "timeout" {
  description = "Timeout in seconds"
  type        = number
  default     = 3
}

variable "architectures" {
  description = "Lambda architectures (arm64 or x86_64)"
  type        = list(string)
  default     = ["arm64"]
}

variable "reserved_concurrent_executions" {
  description = "Reserved concurrent executions (-1 for no reservation)"
  type        = number
  default     = -1
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

# ==============================================================================
# IAM VARIABLES
# ==============================================================================

variable "policy_arns" {
  description = "List of IAM policy ARNs to attach"
  type        = list(string)
  default     = []
}

variable "inline_policy_json" {
  description = "Inline IAM policy JSON"
  type        = string
  default     = null
}

# ==============================================================================
# SQS VARIABLES
# ==============================================================================

variable "sqs_event_source_arn" {
  description = "SQS queue ARN for event source mapping"
  type        = string
  default     = null
}

variable "sqs_batch_size" {
  description = "SQS batch size"
  type        = number
  default     = 10
}

variable "sqs_batch_window" {
  description = "SQS batch window in seconds"
  type        = number
  default     = 0
}

# ==============================================================================
# API GATEWAY VARIABLES
# ==============================================================================

variable "api_gateway_source_arn" {
  description = "API Gateway source ARN for Lambda invoke permission (e.g., arn:aws:execute-api:region:account:api-id/*/*/path)"
  type        = string
  default     = null
}
