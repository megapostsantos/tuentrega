export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_impersonations: {
        Row: {
          admin_id: string
          ended_at: string | null
          id: string
          started_at: string
          target_type: string
          target_user_id: string
        }
        Insert: {
          admin_id: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_type: string
          target_user_id: string
        }
        Update: {
          admin_id?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_type?: string
          target_user_id?: string
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          note: string
          target_type: string
          target_user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          note: string
          target_type: string
          target_user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          note?: string
          target_type?: string
          target_user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          deliverer_subscription_cents: number
          fiscal_note_deadline_day: number
          id: number
          trial_days: number
          updated_at: string
          whatsapp_template_new_offer: string
          whatsapp_template_payment: string
          whatsapp_template_suspension: string
        }
        Insert: {
          deliverer_subscription_cents?: number
          fiscal_note_deadline_day?: number
          id?: number
          trial_days?: number
          updated_at?: string
          whatsapp_template_new_offer?: string
          whatsapp_template_payment?: string
          whatsapp_template_suspension?: string
        }
        Update: {
          deliverer_subscription_cents?: number
          fiscal_note_deadline_day?: number
          id?: number
          trial_days?: number
          updated_at?: string
          whatsapp_template_new_offer?: string
          whatsapp_template_payment?: string
          whatsapp_template_suspension?: string
        }
        Relationships: []
      }
      agenda_previsoes: {
        Row: {
          cancelamento_ate: string | null
          created_at: string
          data_prevista: string
          empresa_id: string
          endereco_coleta: string | null
          hora_abertura: string | null
          id: string
          pacotes_estimados: number
          pacotes_por_rota: number
          permite_cancelamento: boolean
          rotas_estimadas: number
          status: string
          updated_at: string
          valor_por_pacote: number
          veiculo_necessario: string | null
        }
        Insert: {
          cancelamento_ate?: string | null
          created_at?: string
          data_prevista: string
          empresa_id: string
          endereco_coleta?: string | null
          hora_abertura?: string | null
          id?: string
          pacotes_estimados?: number
          pacotes_por_rota?: number
          permite_cancelamento?: boolean
          rotas_estimadas?: number
          status?: string
          updated_at?: string
          valor_por_pacote?: number
          veiculo_necessario?: string | null
        }
        Update: {
          cancelamento_ate?: string | null
          created_at?: string
          data_prevista?: string
          empresa_id?: string
          endereco_coleta?: string | null
          hora_abertura?: string | null
          id?: string
          pacotes_estimados?: number
          pacotes_por_rota?: number
          permite_cancelamento?: boolean
          rotas_estimadas?: number
          status?: string
          updated_at?: string
          valor_por_pacote?: number
          veiculo_necessario?: string | null
        }
        Relationships: []
      }
      alocacoes: {
        Row: {
          alocado_em: string
          created_at: string
          empresa_id: string
          entregador_id: string
          id: string
          oferta_id: string | null
          operacao_id: string
          rota_id: string
          status: string
        }
        Insert: {
          alocado_em?: string
          created_at?: string
          empresa_id: string
          entregador_id: string
          id?: string
          oferta_id?: string | null
          operacao_id: string
          rota_id: string
          status?: string
        }
        Update: {
          alocado_em?: string
          created_at?: string
          empresa_id?: string
          entregador_id?: string
          id?: string
          oferta_id?: string | null
          operacao_id?: string
          rota_id?: string
          status?: string
        }
        Relationships: []
      }
      auditoria_faixas: {
        Row: {
          created_at: string
          empresa_id: string
          faixa_fim: number
          faixa_inicio: number
          id: string
          operacao_id: string
          ordem: number
          pacotes_contados: number
          rota_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          faixa_fim: number
          faixa_inicio: number
          id?: string
          operacao_id: string
          ordem?: number
          pacotes_contados?: number
          rota_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          faixa_fim?: number
          faixa_inicio?: number
          id?: string
          operacao_id?: string
          ordem?: number
          pacotes_contados?: number
          rota_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      confiabilidade_historico: {
        Row: {
          created_at: string
          descricao: string | null
          entregador_id: string
          evento: string
          id: string
          pontos: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          entregador_id: string
          evento: string
          id?: string
          pontos?: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          entregador_id?: string
          evento?: string
          id?: string
          pontos?: number
        }
        Relationships: []
      }
      confiabilidade_score: {
        Row: {
          entregador_id: string
          nivel: string
          score: number
          updated_at: string
        }
        Insert: {
          entregador_id: string
          nivel?: string
          score?: number
          updated_at?: string
        }
        Update: {
          entregador_id?: string
          nivel?: string
          score?: number
          updated_at?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          created_at: string
          estado: string | null
          id: string
          nome_fantasia: string | null
          numero: string | null
          plano: string
          razao_social: string
          responsavel: string | null
          rua: string | null
          segmento: string | null
          status: string
          tms_metodo_padrao: string | null
          tms_mostrar_margem: boolean
          tms_pacotes_por_rota: number | null
          tms_valor_padrao_pacote: number | null
          trial_ends_at: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id: string
          nome_fantasia?: string | null
          numero?: string | null
          plano?: string
          razao_social: string
          responsavel?: string | null
          rua?: string | null
          segmento?: string | null
          status?: string
          tms_metodo_padrao?: string | null
          tms_mostrar_margem?: boolean
          tms_pacotes_por_rota?: number | null
          tms_valor_padrao_pacote?: number | null
          trial_ends_at?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          numero?: string | null
          plano?: string
          razao_social?: string
          responsavel?: string | null
          rua?: string | null
          segmento?: string | null
          status?: string
          tms_metodo_padrao?: string | null
          tms_mostrar_margem?: boolean
          tms_pacotes_por_rota?: number | null
          tms_valor_padrao_pacote?: number | null
          trial_ends_at?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_plano_fkey"
            columns: ["plano"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      entregadores: {
        Row: {
          bairro: string | null
          bairros: string[]
          banco: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string
          created_at: string
          data_nascimento: string | null
          estado: string | null
          id: string
          nome_completo: string
          numero: string | null
          pix_chave: string | null
          pix_tipo: Database["public"]["Enums"]["pix_tipo"] | null
          placa: string | null
          plataforma_comprovante_url: string | null
          plataformas: string[]
          reliability_level: string | null
          reliability_score: number | null
          rua: string | null
          selfie_url: string | null
          status: string
          suspended_at: string | null
          suspension_reason: string | null
          tipo_veiculo: Database["public"]["Enums"]["veiculo_tipo"] | null
          turnos: string[]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          bairros?: string[]
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          estado?: string | null
          id: string
          nome_completo: string
          numero?: string | null
          pix_chave?: string | null
          pix_tipo?: Database["public"]["Enums"]["pix_tipo"] | null
          placa?: string | null
          plataforma_comprovante_url?: string | null
          plataformas?: string[]
          reliability_level?: string | null
          reliability_score?: number | null
          rua?: string | null
          selfie_url?: string | null
          status?: string
          suspended_at?: string | null
          suspension_reason?: string | null
          tipo_veiculo?: Database["public"]["Enums"]["veiculo_tipo"] | null
          turnos?: string[]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          bairros?: string[]
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          estado?: string | null
          id?: string
          nome_completo?: string
          numero?: string | null
          pix_chave?: string | null
          pix_tipo?: Database["public"]["Enums"]["pix_tipo"] | null
          placa?: string | null
          plataforma_comprovante_url?: string | null
          plataformas?: string[]
          reliability_level?: string | null
          reliability_score?: number | null
          rua?: string | null
          selfie_url?: string | null
          status?: string
          suspended_at?: string | null
          suspension_reason?: string | null
          tipo_veiculo?: Database["public"]["Enums"]["veiculo_tipo"] | null
          turnos?: string[]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      entregas: {
        Row: {
          created_at: string
          data_entrega: string
          data_pagamento: string | null
          empresa_id: string
          entregador_id: string
          exige_nota_fiscal: boolean
          id: string
          nota_fiscal_url: string | null
          oferta_id: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_entrega?: string
          data_pagamento?: string | null
          empresa_id: string
          entregador_id: string
          exige_nota_fiscal?: boolean
          id?: string
          nota_fiscal_url?: string | null
          oferta_id?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_entrega?: string
          data_pagamento?: string | null
          empresa_id?: string
          entregador_id?: string
          exige_nota_fiscal?: boolean
          id?: string
          nota_fiscal_url?: string | null
          oferta_id?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "entregas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: false
            referencedRelation: "entregadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas_ocorrencias: {
        Row: {
          created_at: string
          empresa_id: string
          entregador_id: string
          fotos_urls: string[]
          id: string
          motivo: string
          numero_pacote: number
          oferta_id: string
          package_id: string | null
          package_id_scan_method: string | null
          score_impact: number
          sub_motivo: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          entregador_id: string
          fotos_urls?: string[]
          id?: string
          motivo: string
          numero_pacote: number
          oferta_id: string
          package_id?: string | null
          package_id_scan_method?: string | null
          score_impact?: number
          sub_motivo?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          entregador_id?: string
          fotos_urls?: string[]
          id?: string
          motivo?: string
          numero_pacote?: number
          oferta_id?: string
          package_id?: string | null
          package_id_scan_method?: string | null
          score_impact?: number
          sub_motivo?: string | null
        }
        Relationships: []
      }
      entregas_pacotes: {
        Row: {
          created_at: string
          endereco_entrega: string | null
          id: string
          numero_pacote: number
          oferta_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          endereco_entrega?: string | null
          id?: string
          numero_pacote: number
          oferta_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          endereco_entrega?: string | null
          id?: string
          numero_pacote?: number
          oferta_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ofertas: {
        Row: {
          bairro: string | null
          cancelamento_ate: string | null
          closed_at: string | null
          closing_notes: string | null
          created_at: string
          data_trabalho: string | null
          descricao: string | null
          empresa_id: string
          endereco_coleta: string | null
          entregador_id: string | null
          exige_nota_fiscal: boolean
          expira_em: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          operacao_id: string | null
          pacotes_entregues: number | null
          pacotes_nao_entregues: number | null
          permite_cancelamento: boolean | null
          prazo_pagamento: string | null
          prazo_pagamento_data: string | null
          previsao_id: string | null
          quantidade_pacotes: number | null
          quantidade_paradas: number | null
          rota_operacao_id: string | null
          status: string
          tipo_entrega: string | null
          titulo: string
          updated_at: string
          valor: number
          valor_por_pacote: number | null
          veiculo_necessario: string | null
        }
        Insert: {
          bairro?: string | null
          cancelamento_ate?: string | null
          closed_at?: string | null
          closing_notes?: string | null
          created_at?: string
          data_trabalho?: string | null
          descricao?: string | null
          empresa_id: string
          endereco_coleta?: string | null
          entregador_id?: string | null
          exige_nota_fiscal?: boolean
          expira_em?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          operacao_id?: string | null
          pacotes_entregues?: number | null
          pacotes_nao_entregues?: number | null
          permite_cancelamento?: boolean | null
          prazo_pagamento?: string | null
          prazo_pagamento_data?: string | null
          previsao_id?: string | null
          quantidade_pacotes?: number | null
          quantidade_paradas?: number | null
          rota_operacao_id?: string | null
          status?: string
          tipo_entrega?: string | null
          titulo: string
          updated_at?: string
          valor?: number
          valor_por_pacote?: number | null
          veiculo_necessario?: string | null
        }
        Update: {
          bairro?: string | null
          cancelamento_ate?: string | null
          closed_at?: string | null
          closing_notes?: string | null
          created_at?: string
          data_trabalho?: string | null
          descricao?: string | null
          empresa_id?: string
          endereco_coleta?: string | null
          entregador_id?: string | null
          exige_nota_fiscal?: boolean
          expira_em?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          operacao_id?: string | null
          pacotes_entregues?: number | null
          pacotes_nao_entregues?: number | null
          permite_cancelamento?: boolean | null
          prazo_pagamento?: string | null
          prazo_pagamento_data?: string | null
          previsao_id?: string | null
          quantidade_pacotes?: number | null
          quantidade_paradas?: number | null
          rota_operacao_id?: string | null
          status?: string
          tipo_entrega?: string | null
          titulo?: string
          updated_at?: string
          valor?: number
          valor_por_pacote?: number | null
          veiculo_necessario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      operacoes: {
        Row: {
          created_at: string
          data_operacao: string
          empresa_id: string
          id: string
          metodo_divisao: string
          observacoes: string | null
          pacotes_a_mais: number
          pacotes_faltando: number
          status: string
          total_pacotes_contados: number
          total_pacotes_sistema: number
          total_paradas: number
          updated_at: string
          valor_ml_por_pacote: number
          valor_por_pacote: number
        }
        Insert: {
          created_at?: string
          data_operacao?: string
          empresa_id: string
          id?: string
          metodo_divisao?: string
          observacoes?: string | null
          pacotes_a_mais?: number
          pacotes_faltando?: number
          status?: string
          total_pacotes_contados?: number
          total_pacotes_sistema?: number
          total_paradas?: number
          updated_at?: string
          valor_ml_por_pacote?: number
          valor_por_pacote?: number
        }
        Update: {
          created_at?: string
          data_operacao?: string
          empresa_id?: string
          id?: string
          metodo_divisao?: string
          observacoes?: string | null
          pacotes_a_mais?: number
          pacotes_faltando?: number
          status?: string
          total_pacotes_contados?: number
          total_pacotes_sistema?: number
          total_paradas?: number
          updated_at?: string
          valor_ml_por_pacote?: number
          valor_por_pacote?: number
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          name: string
          price_cents: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id: string
          name: string
          price_cents?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          name?: string
          price_cents?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rotas_operacao: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          nome: string
          oferta_id: string | null
          operacao_id: string
          quantidade_pacotes: number
          quantidade_paradas: number
          status: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          oferta_id?: string | null
          operacao_id: string
          quantidade_pacotes?: number
          quantidade_paradas?: number
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          oferta_id?: string | null
          operacao_id?: string
          quantidade_pacotes?: number
          quantidade_paradas?: number
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "rotas_operacao_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_reliability_event: {
        Args: {
          _descricao: string
          _entregador_id: string
          _evento: string
          _pontos: number
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "empresa" | "entregador"
      pix_tipo: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria"
      veiculo_tipo:
        | "walker"
        | "biker"
        | "motoboy"
        | "carro"
        | "caminhao"
        | "moto_eletrica"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "empresa", "entregador"],
      pix_tipo: ["cpf", "cnpj", "email", "telefone", "aleatoria"],
      veiculo_tipo: [
        "walker",
        "biker",
        "motoboy",
        "carro",
        "caminhao",
        "moto_eletrica",
      ],
    },
  },
} as const
