variable "ambiente" {
  description = "Ambiente lógico (hom | prod)."
  type        = string

  validation {
    condition     = contains(["hom", "prod"], var.ambiente)
    error_message = "Ambiente deve ser 'hom' ou 'prod'."
  }
}

variable "regiao" {
  type    = string
  default = "us-east-1"
}

variable "projeto" {
  type    = string
  default = "oficina"
}

variable "jwt_issuer" {
  description = "Issuer do token. Precisa bater com mp.jwt.verify.issuer da aplicação."
  type        = string
  default     = "oficina-mvp"
}

variable "jwt_expiracao" {
  description = "Validade do token de cliente. 30 min conforme ADR 001."
  type        = string
  default     = "30m"
}

variable "role_arn_lambda" {
  description = <<-EOT
    ARN da role de execução da função. Vazio faz o Terraform descobrir a
    LabRole do AWS Academy, que é a única utilizável lá.
  EOT
  type        = string
  default     = ""
}

variable "origens_cors" {
  description = "Origens permitidas no CORS do API Gateway."
  type        = list(string)
  default     = ["*"]
}

variable "throttle_burst" {
  description = "Rajada máxima de requisições no gateway."
  type        = number
  default     = 20
}

variable "throttle_rate" {
  description = "Requisições por segundo sustentadas no gateway."
  type        = number
  default     = 10
}
