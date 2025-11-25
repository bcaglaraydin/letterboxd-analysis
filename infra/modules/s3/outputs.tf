output "bucket_id" {
  value = aws_s3_bucket.this.id
}

output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}

output "website_endpoint" {
  value = var.website_enabled ? aws_s3_bucket_website_configuration.this[0].website_endpoint : ""
}
