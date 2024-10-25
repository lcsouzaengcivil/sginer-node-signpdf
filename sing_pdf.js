const fs = require('fs');
const helpers = require('node-signpdf/dist/helpers');
const signer = require("node-signpdf").default;
const { PDFDocument } = require('pdf-lib');


// Caminhos dos arquivos
const inputPdfPath = './mk.pdf';        // PDF original a ser assinado
const pfxPath = './cert.pfx';        // Caminho do certificado .pfx
const pfxPassword = 'senha123';          // Senha do certificado PFX

// Função para preparar o PDF (adiciona um espaço reservado para a assinatura)
const preparePdf = async (pdfPath) => {
  // Carrega o PDF
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Adiciona um campo de assinatura como texto diretamente no PDF
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  firstPage.drawText('ASSINADO DIGITALMENTE', {
      x: 50, 
      y: 50, 
      size: 10, // Local onde a assinatura será inserida
  });

   // Definir metadados
   pdfDoc.setTitle("Assinatura Digital")
   pdfDoc.setAuthor("autor")
   pdfDoc.setSubject("assunto")
   pdfDoc.setProducer("produtor")
   pdfDoc.setCreator("criador")
   pdfDoc.setKeywords(["email"])
   pdfDoc.setLanguage("en-US")
   pdfDoc.setCreationDate(new Date())
   pdfDoc.setModificationDate(new Date())
   pdfDoc.isEncrypted = true

  // Salva o PDF modificado como Buffer
  const modifiedPdfBytes = await pdfDoc.save({ useObjectStreams: false })
  
  // Insere o campo de assinatura de ByteRange manualmente para que o `node-signpdf` possa encontrá-lo
  const byteRangePlaceholder = ' /ByteRange [0 / / /]                                              ';
  const pdfBuffer = Buffer.concat([
    Buffer.from(modifiedPdfBytes), 
    Buffer.from(byteRangePlaceholder),
    Buffer.from('\n%%EOF')  // Adiciona a linha EOF no final do PDF
  ])

  return pdfBuffer;
};

const uuid = Math.floor(Math.random() * 1000000000).toString();

// Função principal para assinar o PDF
const signPdf = async () => {
  try {
      // Prepara o PDF com o campo de assinatura
      const preparedPdf = await preparePdf(inputPdfPath);
      const p12Buffer = await fs.readFileSync(pfxPath);

      const prePdf = helpers.plainAddPlaceholder({ 
        pdfBuffer: preparedPdf,
        reason: "compra e venda",
        location: "brasil",
      })

      const signedPdf = await signer.sign(prePdf, p12Buffer, { passphrase: pfxPassword });

      // Salva o PDF assinado
      const outputPdfPath = `signed-output${uuid}.pdf`;
      await fs.writeFileSync(outputPdfPath, signedPdf);
      console.log('PDF assinado com sucesso!');
      await extractMetadata(outputPdfPath);
  } 
  catch (error) {
      console.error('Erro ao assinar o PDF:', error);
  }
}
signPdf()

const extractMetadata = async (pdfPath) => {
  try {
      // Carrega o PDF
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Extrai os metadados
      const metadata = {
          title: pdfDoc.getTitle(),
          author: pdfDoc.getAuthor(),
          subject: pdfDoc.getSubject(),
          keywords: pdfDoc.getKeywords(),
          creator: pdfDoc.getCreator(),
          producer: pdfDoc.getProducer(),
          creationDate: pdfDoc.getCreationDate(),
          modificationDate: pdfDoc.getModificationDate(),
      };

      // Exibe os metadados
      console.log("Metadados do PDF:", metadata);
      return metadata;
  } catch (error) {
      console.error("Erro ao extrair metadados:", error);
  }
};

