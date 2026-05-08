# ==============================================================================
# ECR REPOSITORY MODULE
# ==============================================================================
# Creates an ECR repository for Lambda container images
# ==============================================================================

resource "aws_ecr_repository" "this" {
  name                 = var.repository_name
  image_tag_mutability = var.image_tag_mutability
  force_delete         = var.force_delete

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = var.repository_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Lifecycle policy: protect environment-tagged images, expire old untagged ones
resource "aws_ecr_lifecycle_policy" "this" {
  count      = var.enable_lifecycle_policy ? 1 : 0
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = concat(
      # Rule per protected tag prefix — keep the latest image for each
      [for i, prefix in var.protected_tag_prefixes : {
        rulePriority = i + 1
        description  = "Keep latest '${prefix}' tagged image"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["${prefix}*"]
          countType      = "imageCountMoreThan"
          countNumber    = 1
        }
        action = {
          type = "expire"
        }
      }],
      # Final rule — expire old untagged images
      [{
        rulePriority = length(var.protected_tag_prefixes) + 1
        description  = "Remove untagged images beyond ${var.max_image_count}"
        selection = {
          tagStatus   = "untagged"
          countType   = "imageCountMoreThan"
          countNumber = var.max_image_count
        }
        action = {
          type = "expire"
        }
      }]
    )
  })
}

# Repository policy for cross-account access if needed
resource "aws_ecr_repository_policy" "this" {
  count      = var.repository_policy != null ? 1 : 0
  repository = aws_ecr_repository.this.name
  policy     = var.repository_policy
}
