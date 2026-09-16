export function shuffleQuiz(questions, random = Math.random) {
  const shuffle = items => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const letters = ['A', 'B', 'C', 'D'];
  return shuffle(questions).map(question => {
    const combinedAnswer = letters.find(letter =>
      question.options[letter].normalize('NFC').trim().toLocaleLowerCase('vi') === 'cả a, b và c');
    const order = combinedAnswer
      ? [...shuffle(letters.filter(letter => letter !== combinedAnswer)), combinedAnswer]
      : shuffle(letters);
    return { ...question,
      options: Object.fromEntries(letters.map((letter, i) => [letter, question.options[order[i]]])),
      answer: letters[order.indexOf(question.answer)],
    };
  });
}
