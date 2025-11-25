resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_website_configuration" "this" {
  count  = var.website_enabled ? 1 : 0
  bucket = aws_s3_bucket.this.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_iam_policy_document" "cloudfront_oac_access" {
  count = var.cloudfront_distribution_arn != "" ? 1 : 0
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.this.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [var.cloudfront_distribution_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "this" {
  count  = var.cloudfront_distribution_arn != "" ? 1 : 0
  bucket = aws_s3_bucket.this.id
  policy = data.aws_iam_policy_document.cloudfront_oac_access[0].json
}
