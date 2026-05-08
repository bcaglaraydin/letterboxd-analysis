variable "repository_name" {
  description = "Name of the ECR repository"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
  default     = "dev"
}

variable "image_tag_mutability" {
  description = "Image tag mutability setting"
  type        = string
  default     = "MUTABLE"
}

variable "force_delete" {
  description = "Delete repository even if it contains images"
  type        = bool
  default     = true
}

variable "scan_on_push" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}

variable "enable_lifecycle_policy" {
  description = "Enable lifecycle policy to clean up old images"
  type        = bool
  default     = true
}

variable "max_image_count" {
  description = "Maximum number of untagged/SHA-only images to keep (environment-tagged images are always protected)"
  type        = number
  default     = 2
}

variable "protected_tag_prefixes" {
  description = "Tag prefixes to protect from lifecycle expiration (e.g. branch names)"
  type        = list(string)
  default     = ["develop", "master", "latest"]
}

variable "repository_policy" {
  description = "Repository policy JSON (optional)"
  type        = string
  default     = null
}
