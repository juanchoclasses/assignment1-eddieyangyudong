import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;


  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  /**
    * place holder for the evaluator.   I am not sure what the type of the formula is yet 
    * I do know that there will be a list of tokens so i will return the length of the array
    * 
    * I also need to test the error display in the front end so i will set the error message to
    * the error messages found In GlobalDefinitions.ts
    * 
    * according to this formula.
    * 
    7 tokens partial: "#ERR",
    8 tokens divideByZero: "#DIV/0!",
    9 tokens invalidCell: "#REF!",
  10 tokens invalidFormula: "#ERR",
  11 tokens invalidNumber: "#ERR",
  12 tokens invalidOperator: "#ERR",
  13 missingParentheses: "#ERR",
  0 tokens emptyFormula: "#EMPTY!",

                    When i get back from my quest to save the world from the evil thing i will fix.
                      (if you are in a hurry you can fix it yourself)
                               Sincerely 
                               Bilbo
    * 
   */

  evaluate(formula: FormulaType) {


    this._errorMessage = "";
    const postfix = this.infixToPostfix(formula);
    if (this._errorMessage === ErrorMessages.missingParentheses) {
      return;
    }

    this._result = this.evaluatePostfix(postfix);
  }

  infixToPostfix(formula: FormulaType): FormulaType {
    let output: FormulaType = [];
    let ops: TokenType[] = [];

    formula.forEach((token, index) => {
      if (this.isNumber(token)) {
        output.push(token);
      } else if (this.isCellReference(token)) {
        const [value, error] = this.getCellValue(token);
        if (error) {
          this._errorMessage = error;
          return 0; // Halt further execution
        }
        output.push(value);
      } else if (token === "(") {
        ops.push(token);
      } else if (token === ")") {
        if (index === 0 || formula[index - 1] === "(") {
          this._errorMessage = ErrorMessages.missingParentheses;
          return;
        }
        while (ops.length && ops[ops.length - 1] !== "(") {
          output.push(ops.pop() as TokenType);
        }
        ops.pop();
      } else {
        while (ops.length && this.getPrecedence(ops[ops.length - 1]) >= this.getPrecedence(token)) {
          output.push(ops.pop() as TokenType);
        }
        ops.push(token);
      }
    });

    while (ops.length) {
      output.push(ops.pop() as TokenType);
    }

    return output;
  }

  evaluatePostfix(postfix: FormulaType): number {

    let stack: number[] = [];
    let flag: boolean = false;
    let flagResult: number = 0;

    postfix.forEach(token => {
      // use flag to halt further execution
      if (flag) {
        return;
      }
      if (this.isNumber(token)) {
        stack.push(parseFloat(token));
      } else {
        const b = stack.pop() as number;
        const a = stack.pop();
        if (a === undefined) {
          this._errorMessage = ErrorMessages.invalidFormula;
          flag = true;
          flagResult = b;
          return; // Halt further execution
        }

        switch (token) {
          case "+":
            stack.push(a + b);
            break;
          case "-":
            stack.push(a - b);
            break;
          case "*":
            stack.push(a * b);
            break;
          case "/":
            if (b === 0) {
              this._errorMessage = ErrorMessages.divideByZero;
              flag = true;
              flagResult = Infinity;
              return; // Halt further execution
            }
            stack.push(a / b);
            break;
        }
      }
    });
    
    // use flag to halt further execution
    if (flag) {
      return flagResult;
    }

    return stack[0] ?? 0;
  }

  getPrecedence(operator: TokenType): number {
    switch (operator) {
      case "+":
      case "-":
        return 1;
      case "*":
      case "/":
        return 2;
      default:
        return 0;
    }
  }

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }


  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {
    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;