import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { Shield } from "lucide-react";

export function Privacidade() {
  useEffect(() => { document.title = "Política de Privacidade — Vermotu"; }, []);

  return (
    <Layout>
      <div className="container py-14 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Política de Privacidade</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Última atualização: julho de 2026</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-foreground">
          <section>
            <p className="text-muted-foreground text-lg leading-relaxed">
              A <strong className="text-foreground">Vermotu Marketplace</strong> está comprometida com a proteção dos seus dados pessoais e com a transparência sobre como utilizamos as informações que você nos confia. Esta Política de Privacidade está em conformidade com a <strong className="text-foreground">Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
            </p>
          </section>

          {[
            {
              title: "1. Quem somos",
              content: "A Vermotu é uma plataforma brasileira de marketplace especializada em motocicletas, peças, acessórios e serviços de oficina. Operamos sob a razão social Vermotu Marketplace LTDA, com sede no Rio de Janeiro — RJ. Para questões relacionadas à privacidade, entre em contato pelo e-mail: privacidade@vermotu.com.br."
            },
            {
              title: "2. Dados que coletamos",
              items: [
                "Dados de cadastro: nome completo, e-mail, telefone, CPF/CNPJ e senha (armazenada de forma criptografada).",
                "Dados de perfil: foto, cidade, biografia, tipo de conta (pessoa física ou jurídica).",
                "Dados de anúncios: informações sobre produtos e serviços anunciados, incluindo fotos, descrições e preços.",
                "Dados de transação: histórico de compras, vendas, pagamentos e cupons utilizados.",
                "Dados de uso: páginas visitadas, buscas realizadas, interações com anúncios e tempo de navegação.",
                "Dados técnicos: endereço IP, tipo de dispositivo, navegador e sistema operacional."
              ]
            },
            {
              title: "3. Como usamos seus dados",
              items: [
                "Criar e gerenciar sua conta na plataforma.",
                "Processar transações de compra e venda entre usuários.",
                "Facilitar a comunicação entre compradores e vendedores.",
                "Enviar notificações sobre pedidos, mensagens e atualizações da plataforma.",
                "Melhorar continuamente nossos serviços e personalizar sua experiência.",
                "Cumprir obrigações legais e prevenir fraudes.",
                "Enviar comunicações de marketing, mediante seu consentimento."
              ]
            },
            {
              title: "4. Base legal para tratamento",
              content: "Tratamos seus dados com base nas seguintes hipóteses previstas na LGPD: (i) execução de contrato, para viabilizar a prestação dos nossos serviços; (ii) cumprimento de obrigação legal; (iii) legítimo interesse da Vermotu; e (iv) consentimento do titular, quando aplicável."
            },
            {
              title: "5. Compartilhamento de dados",
              content: "Não vendemos seus dados pessoais. Podemos compartilhá-los apenas nas seguintes situações:",
              items: [
                "Com outros usuários da plataforma, na medida necessária para viabilizar transações (ex.: nome e telefone do vendedor para o comprador).",
                "Com prestadores de serviços que nos auxiliam na operação da plataforma (ex.: hospedagem, pagamentos), sempre sob acordos de confidencialidade.",
                "Com autoridades competentes, quando exigido por lei ou ordem judicial.",
                "Em caso de fusão, aquisição ou venda da empresa, com os respectivos adquirentes."
              ]
            },
            {
              title: "6. Segurança dos dados",
              content: "Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não autorizado, perda, destruição ou alteração. As senhas são armazenadas com criptografia bcrypt. As comunicações entre seu navegador e nossos servidores são protegidas por criptografia TLS/HTTPS."
            },
            {
              title: "7. Seus direitos (LGPD)",
              content: "Como titular dos dados, você tem direito a:",
              items: [
                "Confirmar a existência de tratamento dos seus dados.",
                "Acessar os dados que possuímos sobre você.",
                "Corrigir dados incompletos, inexatos ou desatualizados.",
                "Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.",
                "Revogar o consentimento dado anteriormente.",
                "Solicitar a portabilidade dos seus dados.",
                "Opor-se ao tratamento realizado com fundamento em outras bases legais."
              ]
            },
            {
              title: "8. Retenção de dados",
              content: "Mantemos seus dados pelo tempo necessário para a prestação dos serviços e cumprimento de obrigações legais. Após o encerramento da sua conta, podemos reter determinados dados pelo prazo de 5 (cinco) anos, conforme exigências do Código Civil e legislação tributária."
            },
            {
              title: "9. Cookies e tecnologias similares",
              content: "Utilizamos cookies e tecnologias similares para garantir o funcionamento da plataforma, melhorar a experiência do usuário e analisar o tráfego. Você pode configurar seu navegador para recusar cookies, mas isso pode afetar o funcionamento de alguns recursos."
            },
            {
              title: "10. Contato e DPO",
              content: "Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato: E-mail: privacidade@vermotu.com.br | WhatsApp: +55 21 99296-3028 | Endereço: Rio de Janeiro — RJ, Brasil. Respondemos a todas as solicitações em até 15 dias úteis."
            },
            {
              title: "11. Alterações nesta política",
              content: "Podemos atualizar esta Política de Privacidade periodicamente. Em caso de alterações significativas, você será notificado por e-mail ou por aviso em destaque na plataforma. Recomendamos a leitura periódica deste documento."
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
