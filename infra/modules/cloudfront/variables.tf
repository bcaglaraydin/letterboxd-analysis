variable "s3_bucket_regional_domain_name" {
  description = "The regional domain name of the S3 bucket (e.g. bucket.s3.eu-west-1.amazonaws.com)"
  type        = string
}

variable "s3_origin_id" {
  description = "Unique identifier for the origin"
  type        = string
}
