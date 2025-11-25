output "bucket_id" {
  value = aws_s3_bucket.this.id
}

output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}

output "bucket_regional_domain_name" {
  value = aws_s3_bucket.this.bucket_regional_domain_name
}

output "website_endpoint" {
  value = var.website_enabled ? aws_s3_bucket_website_configuration.this[0].website_endpoint : ""
}
