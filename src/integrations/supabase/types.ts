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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analise_editais: {
        Row: {
          analisado_por: string | null
          condicoes_pagamento: string | null
          created_at: string
          criterios: Json | null
          exigencias: Json | null
          id: string
          licitacao_id: string
          local_entrega: string | null
          observacoes: string | null
          penalidades: Json | null
          prazo_entrega: string | null
          riscos: Json | null
          updated_at: string
        }
        Insert: {
          analisado_por?: string | null
          condicoes_pagamento?: string | null
          created_at?: string
          criterios?: Json | null
          exigencias?: Json | null
          id?: string
          licitacao_id: string
          local_entrega?: string | null
          observacoes?: string | null
          penalidades?: Json | null
          prazo_entrega?: string | null
          riscos?: Json | null
          updated_at?: string
        }
        Update: {
          analisado_por?: string | null
          condicoes_pagamento?: string | null
          created_at?: string
          criterios?: Json | null
          exigencias?: Json | null
          id?: string
          licitacao_id?: string
          local_entrega?: string | null
          observacoes?: string | null
          penalidades?: Json | null
          prazo_entrega?: string | null
          riscos?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analise_editais_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: true
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      autorizacao_participacao_log: {
        Row: {
          acao: string
          created_at: string
          empresa_id: string | null
          frase_recebida: string | null
          id: string
          ip_address: string | null
          licitacao_id: string | null
          metadata: Json | null
          motivo: string | null
          proposta_id: string | null
          resultado: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          empresa_id?: string | null
          frase_recebida?: string | null
          id?: string
          ip_address?: string | null
          licitacao_id?: string | null
          metadata?: Json | null
          motivo?: string | null
          proposta_id?: string | null
          resultado: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          empresa_id?: string | null
          frase_recebida?: string | null
          id?: string
          ip_address?: string | null
          licitacao_id?: string | null
          metadata?: Json | null
          motivo?: string | null
          proposta_id?: string | null
          resultado?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      captura_jobs_log: {
        Row: {
          details: Json | null
          id: number
          ran_at: string
          status: string
        }
        Insert: {
          details?: Json | null
          id?: number
          ran_at?: string
          status?: string
        }
        Update: {
          details?: Json | null
          id?: number
          ran_at?: string
          status?: string
        }
        Relationships: []
      }
      compliance_empresas: {
        Row: {
          checklist: Json | null
          created_at: string
          empresa_id: string
          id: string
          licitacao_id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["compliance_status"]
          verificado_em: string | null
        }
        Insert: {
          checklist?: Json | null
          created_at?: string
          empresa_id: string
          id?: string
          licitacao_id: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          verificado_em?: string | null
        }
        Update: {
          checklist?: Json | null
          created_at?: string
          empresa_id?: string
          id?: string
          licitacao_id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          verificado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_empresas_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          captacao_continua: boolean | null
          created_at: string
          id: string
          lance_automatico: boolean | null
          margem_minima: number | null
          modalidades_permitidas: string[] | null
          municipios_priorizados: Json | null
          notificacoes_derrota: boolean | null
          notificacoes_disputa: boolean | null
          notificacoes_email: boolean | null
          notificacoes_nova_licitacao: boolean | null
          notificacoes_prazo_urgente: boolean | null
          notificacoes_push: boolean | null
          notificacoes_telefone: boolean | null
          notificacoes_vitoria: boolean | null
          prioridade_interior: boolean | null
          som_notificacao: boolean | null
          telefone_notificacao: string | null
          tipos_licitacao: string[] | null
          ufs_priorizadas: string[] | null
          updated_at: string
          user_id: string
          valor_maximo: number | null
          valor_minimo: number | null
        }
        Insert: {
          captacao_continua?: boolean | null
          created_at?: string
          id?: string
          lance_automatico?: boolean | null
          margem_minima?: number | null
          modalidades_permitidas?: string[] | null
          municipios_priorizados?: Json | null
          notificacoes_derrota?: boolean | null
          notificacoes_disputa?: boolean | null
          notificacoes_email?: boolean | null
          notificacoes_nova_licitacao?: boolean | null
          notificacoes_prazo_urgente?: boolean | null
          notificacoes_push?: boolean | null
          notificacoes_telefone?: boolean | null
          notificacoes_vitoria?: boolean | null
          prioridade_interior?: boolean | null
          som_notificacao?: boolean | null
          telefone_notificacao?: string | null
          tipos_licitacao?: string[] | null
          ufs_priorizadas?: string[] | null
          updated_at?: string
          user_id: string
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Update: {
          captacao_continua?: boolean | null
          created_at?: string
          id?: string
          lance_automatico?: boolean | null
          margem_minima?: number | null
          modalidades_permitidas?: string[] | null
          municipios_priorizados?: Json | null
          notificacoes_derrota?: boolean | null
          notificacoes_disputa?: boolean | null
          notificacoes_email?: boolean | null
          notificacoes_nova_licitacao?: boolean | null
          notificacoes_prazo_urgente?: boolean | null
          notificacoes_push?: boolean | null
          notificacoes_telefone?: boolean | null
          notificacoes_vitoria?: boolean | null
          prioridade_interior?: boolean | null
          som_notificacao?: boolean | null
          telefone_notificacao?: string | null
          tipos_licitacao?: string[] | null
          ufs_priorizadas?: string[] | null
          updated_at?: string
          user_id?: string
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Relationships: []
      }
      cotacoes: {
        Row: {
          created_at: string
          custo_logistica: number | null
          empresa_id: string
          icms_uf: number | null
          id: string
          licitacao_id: string
          margem_final: number | null
          margem_minima: number | null
          preco_final: number | null
          preco_referencia: number
          preco_sugerido: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_logistica?: number | null
          empresa_id: string
          icms_uf?: number | null
          id?: string
          licitacao_id: string
          margem_final?: number | null
          margem_minima?: number | null
          preco_final?: number | null
          preco_referencia: number
          preco_sugerido?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_logistica?: number | null
          empresa_id?: string
          icms_uf?: number | null
          id?: string
          licitacao_id?: string
          margem_final?: number | null
          margem_minima?: number | null
          preco_final?: number | null
          preco_referencia?: number
          preco_sugerido?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_habilitacao: {
        Row: {
          categoria: Database["public"]["Enums"]["doc_habilitacao_categoria"]
          created_at: string
          descricao: string | null
          drive_file_id: string | null
          drive_url: string | null
          empresa_id: string
          id: string
          licitacao_id: string
          metadata: Json
          mime_type: string | null
          nome: string
          observacoes_ia: string | null
          origem: Database["public"]["Enums"]["doc_habilitacao_origem"]
          proposta_id: string | null
          status: Database["public"]["Enums"]["doc_habilitacao_status"]
          storage_path: string | null
          tamanho_bytes: number | null
          updated_at: string
          validade: string | null
          validado_por_ia: boolean
        }
        Insert: {
          categoria: Database["public"]["Enums"]["doc_habilitacao_categoria"]
          created_at?: string
          descricao?: string | null
          drive_file_id?: string | null
          drive_url?: string | null
          empresa_id: string
          id?: string
          licitacao_id: string
          metadata?: Json
          mime_type?: string | null
          nome: string
          observacoes_ia?: string | null
          origem?: Database["public"]["Enums"]["doc_habilitacao_origem"]
          proposta_id?: string | null
          status?: Database["public"]["Enums"]["doc_habilitacao_status"]
          storage_path?: string | null
          tamanho_bytes?: number | null
          updated_at?: string
          validade?: string | null
          validado_por_ia?: boolean
        }
        Update: {
          categoria?: Database["public"]["Enums"]["doc_habilitacao_categoria"]
          created_at?: string
          descricao?: string | null
          drive_file_id?: string | null
          drive_url?: string | null
          empresa_id?: string
          id?: string
          licitacao_id?: string
          metadata?: Json
          mime_type?: string | null
          nome?: string
          observacoes_ia?: string | null
          origem?: Database["public"]["Enums"]["doc_habilitacao_origem"]
          proposta_id?: string | null
          status?: Database["public"]["Enums"]["doc_habilitacao_status"]
          storage_path?: string | null
          tamanho_bytes?: number | null
          updated_at?: string
          validade?: string | null
          validado_por_ia?: boolean
        }
        Relationships: []
      }
      empresas: {
        Row: {
          certidoes: Json
          certidoes_validas: boolean | null
          certificado_digital_emissor: string | null
          certificado_digital_senha: string | null
          certificado_digital_tipo: string | null
          certificado_digital_validade: string | null
          cnae_codigo: string | null
          cnae_descricao: string | null
          cnaes_secundarios: Json | null
          cnpj: string
          created_at: string
          email: string | null
          email_pop_host: string | null
          email_pop_password: string | null
          email_pop_port: number | null
          email_pop_ssl: boolean | null
          email_pop_user: string | null
          email_smtp_host: string | null
          email_smtp_password: string | null
          email_smtp_port: number | null
          email_smtp_ssl: boolean | null
          email_smtp_user: string | null
          endereco: string | null
          govbr_vinculado: boolean | null
          id: string
          licenca_farmaceutica: boolean | null
          municipio: string
          nome: string
          papel_timbrado_url: string | null
          politica_participacao: Json | null
          razao_social: string | null
          segmento: Database["public"]["Enums"]["segmento_type"]
          sicaf_atualizado_em: string | null
          sicaf_status: string | null
          sicaf_validade: string | null
          telefone: string | null
          uf: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certidoes?: Json
          certidoes_validas?: boolean | null
          certificado_digital_emissor?: string | null
          certificado_digital_senha?: string | null
          certificado_digital_tipo?: string | null
          certificado_digital_validade?: string | null
          cnae_codigo?: string | null
          cnae_descricao?: string | null
          cnaes_secundarios?: Json | null
          cnpj: string
          created_at?: string
          email?: string | null
          email_pop_host?: string | null
          email_pop_password?: string | null
          email_pop_port?: number | null
          email_pop_ssl?: boolean | null
          email_pop_user?: string | null
          email_smtp_host?: string | null
          email_smtp_password?: string | null
          email_smtp_port?: number | null
          email_smtp_ssl?: boolean | null
          email_smtp_user?: string | null
          endereco?: string | null
          govbr_vinculado?: boolean | null
          id?: string
          licenca_farmaceutica?: boolean | null
          municipio: string
          nome: string
          papel_timbrado_url?: string | null
          politica_participacao?: Json | null
          razao_social?: string | null
          segmento?: Database["public"]["Enums"]["segmento_type"]
          sicaf_atualizado_em?: string | null
          sicaf_status?: string | null
          sicaf_validade?: string | null
          telefone?: string | null
          uf: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certidoes?: Json
          certidoes_validas?: boolean | null
          certificado_digital_emissor?: string | null
          certificado_digital_senha?: string | null
          certificado_digital_tipo?: string | null
          certificado_digital_validade?: string | null
          cnae_codigo?: string | null
          cnae_descricao?: string | null
          cnaes_secundarios?: Json | null
          cnpj?: string
          created_at?: string
          email?: string | null
          email_pop_host?: string | null
          email_pop_password?: string | null
          email_pop_port?: number | null
          email_pop_ssl?: boolean | null
          email_pop_user?: string | null
          email_smtp_host?: string | null
          email_smtp_password?: string | null
          email_smtp_port?: number | null
          email_smtp_ssl?: boolean | null
          email_smtp_user?: string | null
          endereco?: string | null
          govbr_vinculado?: boolean | null
          id?: string
          licenca_farmaceutica?: boolean | null
          municipio?: string
          nome?: string
          papel_timbrado_url?: string | null
          politica_participacao?: Json | null
          razao_social?: string | null
          segmento?: Database["public"]["Enums"]["segmento_type"]
          sicaf_atualizado_em?: string | null
          sicaf_status?: string | null
          sicaf_validade?: string | null
          telefone?: string | null
          uf?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      historico_disputas: {
        Row: {
          competidores: number | null
          created_at: string
          detalhes: Json | null
          empresa_id: string
          evento: string
          id: string
          licitacao_id: string
          menor_lance: number | null
          posicao: number | null
          proposta_id: string
          valor_lance: number | null
        }
        Insert: {
          competidores?: number | null
          created_at?: string
          detalhes?: Json | null
          empresa_id: string
          evento: string
          id?: string
          licitacao_id: string
          menor_lance?: number | null
          posicao?: number | null
          proposta_id: string
          valor_lance?: number | null
        }
        Update: {
          competidores?: number | null
          created_at?: string
          detalhes?: Json | null
          empresa_id?: string
          evento?: string
          id?: string
          licitacao_id?: string
          menor_lance?: number | null
          posicao?: number | null
          proposta_id?: string
          valor_lance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_disputas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_disputas_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_disputas_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacoes: {
        Row: {
          created_at: string
          data_abertura: string
          data_limite: string
          edital_analisado: boolean | null
          edital_url: string | null
          email_destino: string | null
          id: string
          metodo_envio: string | null
          modalidade: Database["public"]["Enums"]["modalidade_type"]
          municipio: string
          numero: string
          objeto: string
          objeto_resumido: string | null
          orgao: string
          portal: Database["public"]["Enums"]["portal_type"]
          risco_score: number | null
          roi_score: number | null
          segmento: Database["public"]["Enums"]["segmento_type"]
          status: Database["public"]["Enums"]["licitacao_status"]
          uasg: string | null
          uf: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_abertura: string
          data_limite: string
          edital_analisado?: boolean | null
          edital_url?: string | null
          email_destino?: string | null
          id?: string
          metodo_envio?: string | null
          modalidade: Database["public"]["Enums"]["modalidade_type"]
          municipio: string
          numero: string
          objeto: string
          objeto_resumido?: string | null
          orgao: string
          portal: Database["public"]["Enums"]["portal_type"]
          risco_score?: number | null
          roi_score?: number | null
          segmento: Database["public"]["Enums"]["segmento_type"]
          status?: Database["public"]["Enums"]["licitacao_status"]
          uasg?: string | null
          uf: string
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          data_abertura?: string
          data_limite?: string
          edital_analisado?: boolean | null
          edital_url?: string | null
          email_destino?: string | null
          id?: string
          metodo_envio?: string | null
          modalidade?: Database["public"]["Enums"]["modalidade_type"]
          municipio?: string
          numero?: string
          objeto?: string
          objeto_resumido?: string | null
          orgao?: string
          portal?: Database["public"]["Enums"]["portal_type"]
          risco_score?: number | null
          roi_score?: number | null
          segmento?: Database["public"]["Enums"]["segmento_type"]
          status?: Database["public"]["Enums"]["licitacao_status"]
          uasg?: string | null
          uf?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      livro_caixa: {
        Row: {
          conta_id: string | null
          created_at: string
          created_by: string | null
          data_lancamento: string
          documento: string | null
          empresa_id: string
          historico: string
          id: string
          natureza: Database["public"]["Enums"]["caixa_natureza"]
          nf_id: string | null
          valor: number
        }
        Insert: {
          conta_id?: string | null
          created_at?: string
          created_by?: string | null
          data_lancamento?: string
          documento?: string | null
          empresa_id: string
          historico: string
          id?: string
          natureza: Database["public"]["Enums"]["caixa_natureza"]
          nf_id?: string | null
          valor: number
        }
        Update: {
          conta_id?: string | null
          created_at?: string
          created_by?: string | null
          data_lancamento?: string
          documento?: string | null
          empresa_id?: string
          historico?: string
          id?: string
          natureza?: Database["public"]["Enums"]["caixa_natureza"]
          nf_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "livro_caixa_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livro_caixa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livro_caixa_nf_id_fkey"
            columns: ["nf_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_auditoria: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          empresa_id: string | null
          entidade: string
          entidade_id: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id?: string | null
          entidade: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id?: string | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          created_by: string | null
          custo_unitario: number
          data_movimento: string
          empresa_id: string
          id: string
          nf_id: string | null
          observacao: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["movimento_tipo"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_unitario?: number
          data_movimento?: string
          empresa_id: string
          id?: string
          nf_id?: string | null
          observacao?: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["movimento_tipo"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_unitario?: number
          data_movimento?: string
          empresa_id?: string
          id?: string
          nf_id?: string | null
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: Database["public"]["Enums"]["movimento_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_nf_id_fkey"
            columns: ["nf_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      nf_itens: {
        Row: {
          cfop: string
          cofins_valor: number | null
          created_at: string
          descricao: string
          icms_aliquota: number | null
          icms_base: number | null
          icms_valor: number | null
          id: string
          ipi_valor: number | null
          ncm: string | null
          nf_id: string
          ordem: number
          pis_valor: number | null
          produto_id: string | null
          quantidade: number
          unidade: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cfop: string
          cofins_valor?: number | null
          created_at?: string
          descricao: string
          icms_aliquota?: number | null
          icms_base?: number | null
          icms_valor?: number | null
          id?: string
          ipi_valor?: number | null
          ncm?: string | null
          nf_id: string
          ordem?: number
          pis_valor?: number | null
          produto_id?: string | null
          quantidade: number
          unidade?: string
          valor_total: number
          valor_unitario: number
        }
        Update: {
          cfop?: string
          cofins_valor?: number | null
          created_at?: string
          descricao?: string
          icms_aliquota?: number | null
          icms_base?: number | null
          icms_valor?: number | null
          id?: string
          ipi_valor?: number | null
          ncm?: string | null
          nf_id?: string
          ordem?: number
          pis_valor?: number | null
          produto_id?: string | null
          quantidade?: number
          unidade?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "nf_itens_nf_id_fkey"
            columns: ["nf_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nf_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          chave: string | null
          created_at: string
          data_autorizacao: string | null
          data_emissao: string
          destinatario_cnpj_cpf: string | null
          destinatario_endereco: Json | null
          destinatario_ie: string | null
          destinatario_nome: string | null
          emitente_cnpj: string | null
          empresa_id: string
          id: string
          modelo: Database["public"]["Enums"]["nf_modelo"]
          motivo_rejeicao: string | null
          natureza_operacao: string
          numero: number | null
          observacoes: string | null
          pdf_url: string | null
          plugnotas_id: string | null
          protocolo: string | null
          serie: number
          status: Database["public"]["Enums"]["nf_status"]
          tipo: Database["public"]["Enums"]["nf_tipo"]
          updated_at: string
          valor_cofins: number
          valor_icms: number
          valor_ipi: number
          valor_pis: number
          valor_produtos: number
          valor_total: number
          xml_url: string | null
        }
        Insert: {
          chave?: string | null
          created_at?: string
          data_autorizacao?: string | null
          data_emissao?: string
          destinatario_cnpj_cpf?: string | null
          destinatario_endereco?: Json | null
          destinatario_ie?: string | null
          destinatario_nome?: string | null
          emitente_cnpj?: string | null
          empresa_id: string
          id?: string
          modelo?: Database["public"]["Enums"]["nf_modelo"]
          motivo_rejeicao?: string | null
          natureza_operacao?: string
          numero?: number | null
          observacoes?: string | null
          pdf_url?: string | null
          plugnotas_id?: string | null
          protocolo?: string | null
          serie?: number
          status?: Database["public"]["Enums"]["nf_status"]
          tipo: Database["public"]["Enums"]["nf_tipo"]
          updated_at?: string
          valor_cofins?: number
          valor_icms?: number
          valor_ipi?: number
          valor_pis?: number
          valor_produtos?: number
          valor_total?: number
          xml_url?: string | null
        }
        Update: {
          chave?: string | null
          created_at?: string
          data_autorizacao?: string | null
          data_emissao?: string
          destinatario_cnpj_cpf?: string | null
          destinatario_endereco?: Json | null
          destinatario_ie?: string | null
          destinatario_nome?: string | null
          emitente_cnpj?: string | null
          empresa_id?: string
          id?: string
          modelo?: Database["public"]["Enums"]["nf_modelo"]
          motivo_rejeicao?: string | null
          natureza_operacao?: string
          numero?: number | null
          observacoes?: string | null
          pdf_url?: string | null
          plugnotas_id?: string | null
          protocolo?: string | null
          serie?: number
          status?: Database["public"]["Enums"]["nf_status"]
          tipo?: Database["public"]["Enums"]["nf_tipo"]
          updated_at?: string
          valor_cofins?: number
          valor_icms?: number
          valor_ipi?: number
          valor_pis?: number
          valor_produtos?: number
          valor_total?: number
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_contas: {
        Row: {
          ativo: boolean
          codigo: string
          conta_pai_id: string | null
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          tipo: Database["public"]["Enums"]["conta_tipo"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          conta_pai_id?: string | null
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          tipo: Database["public"]["Enums"]["conta_tipo"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          conta_pai_id?: string | null
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          tipo?: Database["public"]["Enums"]["conta_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_conta_pai_id_fkey"
            columns: ["conta_pai_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_contas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          cest: string | null
          cfop_padrao: string | null
          cofins_cst: string | null
          created_at: string
          custo_medio: number
          descricao: string
          empresa_id: string
          estoque_atual: number
          estoque_minimo: number
          icms_aliquota: number | null
          icms_cst: string | null
          id: string
          ncm: string | null
          origem: string | null
          pis_cst: string | null
          preco_venda: number
          sku: string
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cest?: string | null
          cfop_padrao?: string | null
          cofins_cst?: string | null
          created_at?: string
          custo_medio?: number
          descricao: string
          empresa_id: string
          estoque_atual?: number
          estoque_minimo?: number
          icms_aliquota?: number | null
          icms_cst?: string | null
          id?: string
          ncm?: string | null
          origem?: string | null
          pis_cst?: string | null
          preco_venda?: number
          sku: string
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cest?: string | null
          cfop_padrao?: string | null
          cofins_cst?: string | null
          created_at?: string
          custo_medio?: number
          descricao?: string
          empresa_id?: string
          estoque_atual?: number
          estoque_minimo?: number
          icms_aliquota?: number | null
          icms_cst?: string | null
          id?: string
          ncm?: string | null
          origem?: string | null
          pis_cst?: string | null
          preco_venda?: number
          sku?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      propostas: {
        Row: {
          autorizado_em: string | null
          autorizado_por: string | null
          cotacao_id: string | null
          created_at: string
          documentos: Json | null
          empresa_id: string
          enviado_em: string | null
          id: string
          licitacao_id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["proposta_status"]
          updated_at: string
          valor_proposta: number
        }
        Insert: {
          autorizado_em?: string | null
          autorizado_por?: string | null
          cotacao_id?: string | null
          created_at?: string
          documentos?: Json | null
          empresa_id: string
          enviado_em?: string | null
          id?: string
          licitacao_id: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["proposta_status"]
          updated_at?: string
          valor_proposta: number
        }
        Update: {
          autorizado_em?: string | null
          autorizado_por?: string | null
          cotacao_id?: string | null
          created_at?: string
          documentos?: Json | null
          empresa_id?: string
          enviado_em?: string | null
          id?: string
          licitacao_id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["proposta_status"]
          updated_at?: string
          valor_proposta?: number
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      robo_configuracao: {
        Row: {
          ativo: boolean
          certificado_path: string | null
          created_at: string
          empresa_id: string
          erro_mensagem: string | null
          id: string
          lance_agressivo: boolean | null
          licitacao_id: string
          margem_minima: number | null
          proposta_id: string | null
          status: string | null
          ultimo_heartbeat: string | null
          updated_at: string
          user_id: string
          valor_minimo: number | null
        }
        Insert: {
          ativo?: boolean
          certificado_path?: string | null
          created_at?: string
          empresa_id: string
          erro_mensagem?: string | null
          id?: string
          lance_agressivo?: boolean | null
          licitacao_id: string
          margem_minima?: number | null
          proposta_id?: string | null
          status?: string | null
          ultimo_heartbeat?: string | null
          updated_at?: string
          user_id: string
          valor_minimo?: number | null
        }
        Update: {
          ativo?: boolean
          certificado_path?: string | null
          created_at?: string
          empresa_id?: string
          erro_mensagem?: string | null
          id?: string
          lance_agressivo?: boolean | null
          licitacao_id?: string
          margem_minima?: number | null
          proposta_id?: string | null
          status?: string | null
          ultimo_heartbeat?: string | null
          updated_at?: string
          user_id?: string
          valor_minimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "robo_configuracao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "robo_configuracao_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "robo_configuracao_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      sicaf_drive_config: {
        Row: {
          ativo: boolean
          created_at: string
          folder_id: string
          folder_name: string | null
          id: string
          ultima_sincronizacao: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          folder_id: string
          folder_name?: string | null
          id?: string
          ultima_sincronizacao?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          folder_id?: string
          folder_name?: string | null
          id?: string
          ultima_sincronizacao?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sicaf_refresh_log: {
        Row: {
          erros: number
          id: number
          processadas: number
          ran_at: string
          resultados: Json | null
          status: string
          sucesso: number
        }
        Insert: {
          erros?: number
          id?: number
          processadas?: number
          ran_at?: string
          resultados?: Json | null
          status?: string
          sucesso?: number
        }
        Update: {
          erros?: number
          id?: number
          processadas?: number
          ran_at?: string
          resultados?: Json | null
          status?: string
          sucesso?: number
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
          role?: Database["public"]["Enums"]["app_role"]
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
      run_captura_licitacoes: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "operador" | "viewer"
      caixa_natureza: "debito" | "credito"
      compliance_status: "Apta" | "Apta c/ Ressalva" | "Inapta"
      conta_tipo: "ativo" | "passivo" | "receita" | "despesa" | "patrimonio"
      doc_habilitacao_categoria:
        | "proposta"
        | "juridica"
        | "tecnica"
        | "economica"
        | "fiscal_trabalhista"
        | "catalogo"
      doc_habilitacao_origem: "manual" | "drive" | "sicaf"
      doc_habilitacao_status: "pendente" | "valido" | "vencido" | "rejeitado"
      licitacao_status:
        | "Nova"
        | "Em Análise"
        | "Aguardando Autorização"
        | "Autorizada"
        | "Em Disputa"
        | "Vencida"
        | "Perdida"
        | "Cancelada"
      modalidade_type:
        | "Dispensa com Disputa"
        | "Dispensa sem Disputa"
        | "Compra Direta"
      movimento_tipo: "entrada" | "saida" | "ajuste"
      nf_modelo: "55" | "65"
      nf_status:
        | "rascunho"
        | "enviando"
        | "autorizada"
        | "rejeitada"
        | "cancelada"
        | "denegada"
        | "erro"
      nf_tipo: "entrada" | "saida"
      portal_type:
        | "PNCP"
        | "ComprasNet"
        | "ComprasPublicas"
        | "BLL"
        | "Caixa"
        | "BB"
        | "Portal Estadual"
        | "Portal Municipal"
      proposta_status:
        | "Rascunho"
        | "Enviada"
        | "Em Disputa"
        | "Vencedora"
        | "Perdedora"
        | "Cancelada"
        | "Aguardando Envio"
        | "Erro no Envio"
      segmento_type: "Medicamentos" | "Empreendimentos"
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
      app_role: ["admin", "operador", "viewer"],
      caixa_natureza: ["debito", "credito"],
      compliance_status: ["Apta", "Apta c/ Ressalva", "Inapta"],
      conta_tipo: ["ativo", "passivo", "receita", "despesa", "patrimonio"],
      doc_habilitacao_categoria: [
        "proposta",
        "juridica",
        "tecnica",
        "economica",
        "fiscal_trabalhista",
        "catalogo",
      ],
      doc_habilitacao_origem: ["manual", "drive", "sicaf"],
      doc_habilitacao_status: ["pendente", "valido", "vencido", "rejeitado"],
      licitacao_status: [
        "Nova",
        "Em Análise",
        "Aguardando Autorização",
        "Autorizada",
        "Em Disputa",
        "Vencida",
        "Perdida",
        "Cancelada",
      ],
      modalidade_type: [
        "Dispensa com Disputa",
        "Dispensa sem Disputa",
        "Compra Direta",
      ],
      movimento_tipo: ["entrada", "saida", "ajuste"],
      nf_modelo: ["55", "65"],
      nf_status: [
        "rascunho",
        "enviando",
        "autorizada",
        "rejeitada",
        "cancelada",
        "denegada",
        "erro",
      ],
      nf_tipo: ["entrada", "saida"],
      portal_type: [
        "PNCP",
        "ComprasNet",
        "ComprasPublicas",
        "BLL",
        "Caixa",
        "BB",
        "Portal Estadual",
        "Portal Municipal",
      ],
      proposta_status: [
        "Rascunho",
        "Enviada",
        "Em Disputa",
        "Vencedora",
        "Perdedora",
        "Cancelada",
        "Aguardando Envio",
        "Erro no Envio",
      ],
      segmento_type: ["Medicamentos", "Empreendimentos"],
    },
  },
} as const
