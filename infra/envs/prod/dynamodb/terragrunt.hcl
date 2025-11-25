include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/dynamodb"
}

inputs = {
  table_name = "letterboxd-users-prod"
  hash_key   = "username"
}
