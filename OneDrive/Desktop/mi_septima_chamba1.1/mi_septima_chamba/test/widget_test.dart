import 'package:flutter_test/flutter_test.dart';
import 'package:next_gen_ui/main.dart';

void main() {
  testWidgets('Title screen UI test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const NextGenApp());

    // Wait for all animations to complete.
    await tester.pumpAndSettle();

    // Verify that the title and subtitle are present.
    expect(find.text('OUTPOST'), findsOneWidget);
    expect(find.text('INTO THE UNKNOWN'), findsOneWidget);

    // Verify that the difficulty buttons are present.
    expect(find.text('CASUAL'), findsOneWidget);
    expect(find.text('NORMAL'), findsOneWidget);
    expect(find.text('HARDCORE'), findsOneWidget);

    // Verify that the start button is present.
    expect(find.text('START MISSION'), findsOneWidget);
  });
}