from django.shortcuts import render

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .convex_client import get_convex_client


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        convex_status = "unknown"
        try:
            if settings.CONVEX_URL:
                get_convex_client()
                convex_status = "configured"
            else:
                convex_status = "missing_url"
        except Exception as e:
            convex_status = f"error: {str(e)}"

        return Response(
            {
                "status": "ok",
                "service": "PunPost API",
                "convex": convex_status,
                "debug": settings.DEBUG,
            },
            status=status.HTTP_200_OK,
        )