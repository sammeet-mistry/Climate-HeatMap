public class TestJUnit {
    public static void exampleAssert() {
        if (1 + 1 != 2) {
            throw new AssertionError("Math is broken");
        }
    }

    public static void main(String[] args) {
        exampleAssert();
        System.out.println("Java test passed");
    }
}
