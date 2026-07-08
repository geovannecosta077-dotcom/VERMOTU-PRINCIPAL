import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { FileText } from "lucide-react";

export function Termos() {
  useEffect(() => { document.title = "Termos de Uso — Vermotu"; }, []);

  return (
    <Layout>
      <div className="container py-14 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Termos de Uso</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Última atualização: julho de 2026</p>
          </div>
        </div>

        <div className="space-y-8 text-foreground">
          <section>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Bem-vindo à <strong className="text-foreground">Vermotu</strong>. Ao acessar ou utilizar nossa plataforma, você concorda com estes Termos de Uso. Leia-os com atenção antes de criar sua conta ou publicar anúncios.
            </p>
          </section>

          {[
            {
              title: "1. Aceitação dos Termos",
              content: "Ao se cadastrar na Vermotu, você declara ter lido, compreendido e aceito integralmente estes Termos de Uso, bem como nossa Política de Privacidade. Caso não concorde com qualquer disposição, não utilize a plataforma."
            },
            {
              title: "2. Sobre a Vermotu",
              content: "A Vermotu é uma plataforma de marketplace online que conecta compradores e vendedores de motocicletas, peças, acessórios e serviços de manutenção. A Vermotu não é parte nas transações realizadas entre usuários, atuando apenas como intermediária tecnológica."
            },
            {
              title: "3. Cadastro e conta",
              items: [
                "Para utilizar os recursos completos da plataforma, é necessário criar uma conta com dados verídicos e atualizados.",
                "Cada pessoa pode manter apenas uma conta ativa. Contas duplicadas poderão ser encerradas.",
                "Você é responsável pela confidencialidade da sua senha e por todas as atividades realizadas em sua conta.",
                "A Vermotu se reserva o direito de suspender ou encerrar contas que violem estes termos.",
                "É necessário ter 18 anos ou mais para se cadastrar e realizar transações na plataforma."
              ]
            },
            {
              title: "4. Publicação de anúncios",
              items: [
                "Todos os anúncios passam por análise e aprovação da equipe Vermotu antes de serem publicados.",
                "Os anúncios devem conter informações verdadeiras, precisas e atualizadas sobre o produto ou serviço.",
                "É proibido anunciar itens ilegais, roubados, falsificados ou que violem direitos de terceiros.",
                "Fotos dos anúncios devem representar fielmente o produto real oferecido.",
                "A Vermotu pode remover, sem aviso prévio, anúncios que violem estes termos ou a legislação aplicável.",
                "O vendedor é exclusivamente responsável pela veracidade das informações publicadas."
              ]
            },
            {
              title: "5. Transações e pagamentos",
              items: [
                "A Vermotu facilita o contato entre compradores e vendedores, mas não garante a conclusão de nenhuma transação.",
                "Os usuários são responsáveis por acordar os termos de pagamento, entrega e devolução entre si.",
                "Recomendamos que as transações sejam realizadas com cautela, preferindo meios de pagamento seguros e com comprovante.",
                "Em caso de disputa entre usuários, a Vermotu pode, a seu exclusivo critério, auxiliar na mediação, mas não assume responsabilidade pelo resultado."
              ]
            },
            {
              title: "6. Planos e assinaturas",
              content: "A Vermotu oferece planos pagos (Pro e Premium) que conferem benefícios adicionais, como mais anúncios ativos, destaque nas buscas e acesso a relatórios. Os valores e condições dos planos estão disponíveis na página /planos. O cancelamento do plano pode ser solicitado a qualquer momento, sem multa, e os benefícios se mantêm até o fim do período pago."
            },
            {
              title: "7. Condutas proibidas",
              items: [
                "Publicar informações falsas, enganosas ou fraudulentas.",
                "Assediar, ameaçar ou discriminar outros usuários.",
                "Usar a plataforma para fins ilegais ou não autorizados.",
                "Tentar acessar sistemas, dados ou contas de outros usuários sem autorização.",
                "Realizar engenharia reversa, copiar ou reproduzir o código-fonte da plataforma.",
                "Criar múltiplas contas para burlar regras ou penalidades.",
                "Usar bots, scrapers ou sistemas automatizados sem autorização expressa."
              ]
            },
            {
              title: "8. Limitação de responsabilidade",
              content: "A Vermotu não se responsabiliza por: (i) perdas financeiras decorrentes de transações entre usuários; (ii) veracidade das informações publicadas por usuários; (iii) qualidade, segurança ou legalidade dos produtos anunciados; (iv) indisponibilidade temporária da plataforma; (v) danos indiretos, incidentais ou consequenciais. A responsabilidade máxima da Vermotu em qualquer circunstância se limita ao valor pago pelo usuário nos últimos 12 meses."
            },
            {
              title: "9. Propriedade intelectual",
              content: "Todo o conteúdo da plataforma Vermotu — incluindo marca, logo, design, textos, código e funcionalidades — é de propriedade exclusiva da Vermotu Marketplace LTDA e protegido pela legislação de propriedade intelectual. É vedada qualquer reprodução, distribuição ou uso sem autorização prévia e por escrito."
            },
            {
              title: "10. Moderação e denúncias",
              content: "Usuários podem reportar anúncios ou comportamentos inadequados diretamente na plataforma. Nossa equipe analisará as denúncias e tomará as medidas cabíveis, que podem incluir remoção de conteúdo, suspensão temporária ou encerramento permanente de contas."
            },
            {
              title: "11. Alterações nos termos",
              content: "A Vermotu pode atualizar estes Termos de Uso a qualquer momento. Alterações significativas serão comunicadas com pelo menos 10 dias de antecedência por e-mail ou aviso na plataforma. O uso continuado da plataforma após a vigência das alterações implica sua aceitação."
            },
            {
              title: "12. Lei aplicável e foro",
              content: "Estes Termos de Uso são regidos pela legislação brasileira. Fica eleito o Foro da Comarca do Rio de Janeiro — RJ para dirimir quaisquer controvérsias, com renúncia expressa a qualquer outro, por mais privilegiado que seja."
            },
            {
              title: "13. Contato",
              content: "Dúvidas sobre estes Termos de Uso? Entre em contato: E-mail: juridico@vermotu.com.br | WhatsApp: +55 21 99296-3028 | Endereço: Rio de Janeiro — RJ, Brasil."
            }
          ].map((sec) => (
            <section key={sec.title} className="border-t border-border pt-6">
              <h2 className="text-xl font-bold mb-3">{sec.title}</h2>
              {sec.content && <p className="text-muted-foreground leading-relaxed mb-3">{sec.content}</p>}
              {sec.items && (
                <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
                  {sec.items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
}
