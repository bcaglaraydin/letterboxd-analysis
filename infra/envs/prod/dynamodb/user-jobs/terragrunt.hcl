include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../../modules/dynamodb"
}

inputs = {
  table_name = "UserJobs-prod"
  hash_key      = "username"
  ttl_attribute = "ttl"
}
