import Int "mo:base/Int";
import Nat "mo:base/Nat";

actor {
    stable var highScore : Nat = 0;

    public query func getHighScore() : async Nat {
        highScore
    };

    public func updateScore(newScore : Nat) : async () {
        if (newScore > highScore) {
            highScore := newScore;
        };
    };
}
