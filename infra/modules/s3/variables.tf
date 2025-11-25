variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "website_enabled" {
  description = "Enable static website hosting"
  type        = bool
  default     = false
}

variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution for OAC access"
  type        = string
  default     = ""
}
