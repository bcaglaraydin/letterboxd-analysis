variable "table_name" {
  description = "Name of the DynamoDB table"
  type        = string
}

variable "hash_key" {
  description = "Hash key for the table"
  type        = string
}

variable "range_key" {
  description = "Range key for the table (optional)"
  type        = string
  default     = null
}

variable "ttl_attribute" {
  description = "Attribute name for TTL (optional)"
  type        = string
  default     = null
}
