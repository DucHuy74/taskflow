import 'package:flutter/material.dart';

import '../../../models/backlog/graph_model.dart';
import '../painters/graph_painters.dart';
import '../theme/graph_theme.dart';

class GraphNodeWidgets {
  static Widget buildSubjectNode(
    String text,
    double w,
    double h,
    bool isHovered,
    bool isSelected,
    GraphTheme theme,
  ) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: w,
      height: h,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: isSelected
            ? theme.subjectBorder.withOpacity(0.3)
            : theme.subjectFill,
        borderRadius: BorderRadius.circular(h / 2),
        border: Border.all(
          color: isSelected
              ? theme.selectionBorder
              : (isHovered
                  ? theme.subjectBorder
                  : theme.subjectBorder.withOpacity(0.7)),
          width: isSelected || isHovered ? 2.5 : 2.0,
        ),
        boxShadow: [
          BoxShadow(
            color: theme.subjectBorder.withOpacity(
              isSelected || isHovered ? 0.4 : 0.15,
            ),
            blurRadius: isSelected || isHovered ? 20 : 12,
          ),
        ],
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: TextStyle(
          color: theme.textPrimary,
          fontWeight: FontWeight.bold,
          fontSize: text.length > 8 ? 12 : 14,
        ),
      ),
    );
  }

  static Widget buildVerbNode(
    String text,
    double w,
    double h,
    bool isHovered,
    bool isSelected,
    GraphTheme theme,
    AnimationController spinController,
  ) {
    return AnimatedBuilder(
      animation: spinController,
      builder: (context, child) {
        return CustomPaint(
          painter: GlowCirclePainter(
            color: isSelected ? theme.selectionBorder : theme.verbBorder,
            glowRadius: (isSelected || isHovered) ? 0.8 : 0.4,
            animValue: spinController.value,
          ),
          child: Container(
            width: w,
            height: h,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: theme.verbFill,
              shape: BoxShape.circle,
              border: Border.all(
                color: isSelected
                    ? theme.selectionBorder
                    : theme.verbBorder.withOpacity(isHovered ? 1.0 : 0.8),
                width: isSelected ? 2.5 : 1.5,
              ),
            ),
            child: Text(
              text,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: theme.textPrimary,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        );
      },
    );
  }

  static Widget buildObjectNode(
    String text,
    AnalyzedStory? story,
    double w,
    double h,
    bool isHovered,
    bool isSelected,
    GraphTheme theme,
  ) {
    Color borderColor = story?.status == USStatus.done
        ? theme.doneColor
        : (story?.status == USStatus.inProgress
            ? theme.inProgressColor
            : theme.objectBorder);
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: w,
      height: h,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: isSelected ? borderColor.withOpacity(0.3) : theme.objectFill,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isSelected
              ? theme.selectionBorder
              : (isHovered ? borderColor : borderColor.withOpacity(0.7)),
          width: isSelected || isHovered ? 2.0 : 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: borderColor.withOpacity(
              isSelected || isHovered ? 0.35 : 0.1,
            ),
            blurRadius: isSelected || isHovered ? 16 : 6,
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: theme.textPrimary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
