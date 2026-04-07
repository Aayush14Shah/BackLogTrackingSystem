const mammoth = require("mammoth");
const fs = require("fs");

mammoth.convertToHtml({path: "../transcript BATCH 2020 VIRAJ PARIKH.docx"})
    .then(function(result){
        const html = result.value;
        const messages = result.messages;
        fs.writeFileSync("tmp_transcript.html", html);
        console.log("HTML written.");
        if(messages.length > 0) console.log(messages);
    })
    .done();
