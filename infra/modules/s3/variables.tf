variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "website_enabled" {
  description = "Enable static website hosting"
  type        = bool
  default     = false
}
