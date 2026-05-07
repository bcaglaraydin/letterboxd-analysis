include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../../modules/dynamodb"
}

inputs = {
  table_name = "UserJobs-dev"
  hash_key      = "username"
  ttl_attribute = "ttl"
}
