export class Transcription {
  wordList: string[] = [];

  constructor(
    public indexableTranscription: string,
    public originalTranscription: string,
  ) {
    this.wordList = indexableTranscription.split(' ');
  }
}
