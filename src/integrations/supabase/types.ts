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
          razao_social: string
          responsavel: string | null
          rua: string | null
          segmento: string | null
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
          razao_social: string
          responsavel?: string | null
          rua?: string | null
          segmento?: string | null
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
          razao_social?: string
          responsavel?: string | null
          rua?: string | null
          segmento?: string | null
          trial_ends_at?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      entregadores: {
        Row: {
          bairros: string[]
          banco: string | null
          cpf: string
          created_at: string
          id: string
          nome_completo: string
          pix_chave: string | null
          pix_tipo: Database["public"]["Enums"]["pix_tipo"] | null
          tipo_veiculo: Database["public"]["Enums"]["veiculo_tipo"] | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          bairros?: string[]
          banco?: string | null
          cpf: string
          created_at?: string
          id: string
          nome_completo: string
          pix_chave?: string | null
          pix_tipo?: Database["public"]["Enums"]["pix_tipo"] | null
          tipo_veiculo?: Database["public"]["Enums"]["veiculo_tipo"] | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          bairros?: string[]
          banco?: string | null
          cpf?: string
          created_at?: string
          id?: string
          nome_completo?: string
          pix_chave?: string | null
          pix_tipo?: Database["public"]["Enums"]["pix_tipo"] | null
          tipo_veiculo?: Database["public"]["Enums"]["veiculo_tipo"] | null
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
      ofertas: {
        Row: {
          bairro: string | null
          created_at: string
          descricao: string | null
          empresa_id: string
          exige_nota_fiscal: boolean
          id: string
          status: string
          titulo: string
          updated_at: string
          valor: number
        }
        Insert: {
          bairro?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id: string
          exige_nota_fiscal?: boolean
          id?: string
          status?: string
          titulo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          bairro?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          exige_nota_fiscal?: boolean
          id?: string
          status?: string
          titulo?: string
          updated_at?: string
          valor?: number
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
      veiculo_tipo: "walker" | "biker" | "motoboy" | "carro" | "caminhao"
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
      veiculo_tipo: ["walker", "biker", "motoboy", "carro", "caminhao"],
    },
  },
} as const
