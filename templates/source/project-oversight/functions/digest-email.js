// Weekly digest without AI (email.summaryBinding). Nothing needs attention: no email (nonEmpty:false).
return digest.count?{nonEmpty:true,subject:'Programs weekly digest: '+digest.count+(digest.count===1?' item needs':' items need')+' attention',text:digestText(digest)}:{nonEmpty:false,text:'Nothing needs attention this week.'};
