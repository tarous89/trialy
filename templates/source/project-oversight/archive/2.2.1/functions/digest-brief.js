// Weekly digest brief (research.briefBinding). The runner writes the summary from this context only.
return {context:JSON.stringify({instructions:digest.count?'Write the weekly digest from these items.':'Nothing needs attention this week: save nothing and complete with no_update.',digest,plain_text:digestText(digest)})};
