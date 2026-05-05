include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/cost-protection"
}

inputs = {
  environment    = "dev"
  monthly_budget = 15
  # notification_email = "your-email@example.com" # Optional: Add if wanted later
}
