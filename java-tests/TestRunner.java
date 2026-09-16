public class TestRunner {
    public static void main(String[] args) {
        try {
            TestJUnit.exampleAssert();
            System.out.println("Java TestRunner: SUCCESS");
        } catch (AssertionError e) {
            System.out.println("Java TestRunner: FAILED");
            e.printStackTrace();
        }
    }
}
